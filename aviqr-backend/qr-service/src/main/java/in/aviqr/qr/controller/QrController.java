package in.aviqr.qr.controller;
import in.aviqr.qr.dto.ApiResponse;
import in.aviqr.qr.entity.*;
import in.aviqr.qr.repository.QrCodeRepository;
import in.aviqr.qr.service.QrService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/v1/qr-codes") @RequiredArgsConstructor
public class QrController {
    private final QrService service;
    private final QrCodeRepository qrRepo;

    // Admin — list all QR codes platform-wide
    @GetMapping("/admin/all")
    public ResponseEntity<ApiResponse<Page<QrCode>>> adminAll(
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="30") int size) {
        if (!"ADMIN".equals(role) && !"SUPPORT".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(
            qrRepo.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()))));
    }

    // Admin — toggle QR active/inactive
    @PutMapping("/{id}/active")
    public ResponseEntity<ApiResponse<Void>> toggleActive(
            @PathVariable java.util.UUID id,
            @RequestParam boolean active,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!"ADMIN".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        qrRepo.findById(id).ifPresent(q -> { q.setActive(active); qrRepo.save(q); });
        return ResponseEntity.ok(ApiResponse.ok("Updated", null));
    }

    @PostMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<QrCode>> create(
            @PathVariable String shopId,
            @RequestParam(defaultValue="Main QR") String label,
            @RequestParam(defaultValue="SHOP") String type,
            @RequestParam(required=false) String group,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestHeader(value="X-Shop-Id", defaultValue="") String callerShopId) {
        if (!"ADMIN".equals(role)) {
            if (!shopId.equals(callerShopId))
                return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        }
        return ResponseEntity.ok(ApiResponse.ok("QR created",
            service.create(shopId, label, QrType.valueOf(type.toUpperCase()), group)));
    }

    @GetMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<List<QrCode>>> getByShop(@PathVariable String shopId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByShop(shopId)));
    }

    // Redirect — called when customer scans QR
    @GetMapping("/r/{code}")
    public ResponseEntity<Void> redirect(
            @PathVariable String code,
            @RequestHeader(value="X-Forwarded-For", required=false) String ip,
            @RequestHeader(value="User-Agent", required=false) String ua) {
        String url = service.resolveAndTrack(code, ip, ua);
        return ResponseEntity.status(HttpStatus.FOUND)
            .header(HttpHeaders.LOCATION, url)
            .build();
    }

    // Download QR as PNG
    @GetMapping("/{code}/image")
    public ResponseEntity<byte[]> getImage(@PathVariable String code) throws Exception {
        return ResponseEntity.ok()
            .contentType(MediaType.IMAGE_PNG)
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=qr-" + code + ".png")
            .body(service.generateQrImage(code));
    }
}