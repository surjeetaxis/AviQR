package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.GuestDocument;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.entity.RoomReservation;
import in.aviqr.pms.repository.GuestDocumentRepository;
import in.aviqr.pms.repository.ReservationRepository;
import in.aviqr.pms.service.BookingVoucherService;
import in.aviqr.pms.service.FrontDeskService;
import in.aviqr.pms.service.GuestDocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Front desk: find a reservation (voucher QR, reference, phone, name), assign or change
 *  rooms, keep encrypted ID scans, and resend the guest's booking voucher. */
@RestController @RequiredArgsConstructor
public class FrontDeskController {

    private final FrontDeskService frontDesk;
    private final GuestDocumentService documents;
    private final GuestDocumentRepository documentRepo;
    private final BookingVoucherService vouchers;
    private final ReservationRepository reservationRepo;
    private final HotelServiceClient hotelServiceClient;

    public record MoveRequest(UUID roomId, BigDecimal ratePerNight) { }

    @GetMapping("/api/v1/pms/front-desk/hotel/{hotelId}/lookup")
    public ResponseEntity<ApiResponse<List<Reservation>>> lookup(@PathVariable UUID hotelId, @RequestParam String q,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role)) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok(frontDesk.lookup(hotelId, q)));
    }

    @GetMapping("/api/v1/pms/reservations/{id}/rooms/{lineId}/options")
    public ResponseEntity<ApiResponse<List<FrontDeskService.RoomOption>>> roomOptions(@PathVariable UUID id, @PathVariable UUID lineId,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!allowed(id, uid, role)) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok(frontDesk.roomOptions(id, lineId)));
    }

    @PostMapping("/api/v1/pms/reservations/{id}/rooms/{lineId}/move")
    public ResponseEntity<ApiResponse<RoomReservation>> moveRoom(@PathVariable UUID id, @PathVariable UUID lineId, @RequestBody MoveRequest req,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!allowed(id, uid, role)) return forbidden();
        if (req == null || req.roomId() == null) return ResponseEntity.badRequest().body(ApiResponse.error("Choose a room"));
        try {
            return ResponseEntity.ok(ApiResponse.ok("Room updated", frontDesk.moveRoom(id, lineId, req.roomId(), req.ratePerNight(), uid)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/api/v1/pms/reservations/{id}/documents")
    public ResponseEntity<ApiResponse<Map<String, Object>>> listDocuments(@PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!allowed(id, uid, role)) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("enabled", documents.enabled(), "documents", documents.list(id))));
    }

    @PostMapping(value="/api/v1/pms/reservations/{id}/documents", consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadDocument(@PathVariable UUID id,
            @RequestParam("file") MultipartFile file, @RequestParam(defaultValue="OTHER") String docType,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) throws IOException {
        Reservation r = reservationRepo.findById(id).orElse(null);
        if (r == null) return ResponseEntity.notFound().build();
        if (!hotelServiceClient.hasAccess(r.getHotelId(), uid, role)) return forbidden();
        if (file.getSize() > GuestDocumentService.MAX_BYTES) return ResponseEntity.badRequest().body(ApiResponse.error("Files must be under 5 MB"));
        try {
            GuestDocument doc = documents.store(r.getHotelId(), id, docType, file.getContentType(), file.getBytes(), uid);
            return ResponseEntity.ok(ApiResponse.ok("Document saved", Map.of("id", doc.getId(), "docType", doc.getDocType(),
                "contentType", doc.getContentType(), "sizeBytes", doc.getSizeBytes())));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(ApiResponse.error(e.getMessage()));
        }
    }

    /** The decrypted scan, never cached by browsers or proxies. */
    @GetMapping("/api/v1/pms/documents/{docId}")
    public ResponseEntity<byte[]> document(@PathVariable UUID docId,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        GuestDocument doc = documentRepo.findById(docId).orElse(null);
        if (doc == null) return ResponseEntity.notFound().build();
        if (!hotelServiceClient.hasAccess(doc.getHotelId(), uid, role)) return ResponseEntity.status(403).build();
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(doc.getContentType()))
            .cacheControl(CacheControl.noStore()).header(HttpHeaders.CONTENT_DISPOSITION, "inline")
            .header("X-Content-Type-Options", "nosniff").body(documents.read(doc));
    }

    @DeleteMapping("/api/v1/pms/documents/{docId}")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(@PathVariable UUID docId,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        GuestDocument doc = documentRepo.findById(docId).orElse(null);
        if (doc == null) return ResponseEntity.notFound().build();
        if (!hotelServiceClient.hasAccess(doc.getHotelId(), uid, role)) return forbidden();
        documentRepo.delete(doc);
        return ResponseEntity.ok(ApiResponse.ok("Deleted", null));
    }

    /** Voucher link for staff to open or print, and a resend to the guest's email on file. */
    @GetMapping("/api/v1/pms/reservations/{id}/voucher-link")
    public ResponseEntity<ApiResponse<Map<String, Object>>> voucherLink(@PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Reservation r = reservationRepo.findById(id).orElse(null);
        if (r == null) return ResponseEntity.notFound().build();
        if (!hotelServiceClient.hasAccess(r.getHotelId(), uid, role)) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("reference", BookingVoucherService.reference(id),
            "path", "/#/voucher/" + r.getHotelId() + "/" + id + "/" + vouchers.tokenFor(id))));
    }

    @PostMapping("/api/v1/pms/reservations/{id}/voucher/email")
    public ResponseEntity<ApiResponse<Boolean>> emailVoucher(@PathVariable UUID id, @RequestParam(defaultValue="") String storefrontHost,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!allowed(id, uid, role)) return forbidden();
        return vouchers.email(id, storefrontHost)
            ? ResponseEntity.ok(ApiResponse.ok("Voucher sent", true))
            : ResponseEntity.badRequest().body(ApiResponse.error("No email on this booking, or it was emailed 3 times in the last hour"));
    }

    private boolean allowed(UUID reservationId, String uid, String role) {
        return reservationRepo.findById(reservationId).map(r -> hotelServiceClient.hasAccess(r.getHotelId(), uid, role)).orElse(false);
    }

    private static <T> ResponseEntity<ApiResponse<T>> forbidden() {
        return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
    }
}
