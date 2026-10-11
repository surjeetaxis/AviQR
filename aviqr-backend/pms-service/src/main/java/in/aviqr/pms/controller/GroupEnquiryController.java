package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.GroupEnquiry;
import in.aviqr.pms.repository.GroupEnquiryRepository;
import in.aviqr.pms.service.GroupEnquiryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/** Group quote requests: guests send them from the booking engine, staff work them. */
@RestController @RequiredArgsConstructor
public class GroupEnquiryController {
    private final GroupEnquiryService enquiries;
    private final GroupEnquiryRepository enquiryRepo;
    private final HotelServiceClient hotelServiceClient;
    private final Map<String, Deque<Instant>> recent = new ConcurrentHashMap<>();

    /** Limited to 5 enquiries per caller per hour. Storefront host and slug travel in the (encrypted) body. */
    @PostMapping("/api/v1/pms/public/booking-engine/{hotelId}/group-enquiries")
    public ResponseEntity<ApiResponse<Map<String, Object>>> submit(@PathVariable UUID hotelId, @RequestBody Map<String, Object> body,
            @RequestHeader(value="X-Forwarded-For", defaultValue="") String forwardedFor) {
        if (!hotelServiceClient.isBookingEnginePropertyAvailable(hotelId, str(body.get("storefrontHost")), str(body.get("storefrontSlug"))))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        Deque<Instant> calls = recent.computeIfAbsent(hotelId + "|" + forwardedFor.split(",")[0].trim(), k -> new ArrayDeque<>());
        synchronized (calls) {
            while (!calls.isEmpty() && calls.peekFirst().isBefore(Instant.now().minusSeconds(3600))) calls.pollFirst();
            if (calls.size() >= 5) return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(ApiResponse.error("Too many enquiries. Please call the hotel instead."));
            calls.addLast(Instant.now());
        }
        try {
            GroupEnquiry req = GroupEnquiry.builder().organizerName(str(body.get("organizerName"))).organizerPhone(str(body.get("organizerPhone")))
                .organizerEmail(str(body.get("organizerEmail"))).company(str(body.get("company"))).eventType(str(body.get("eventType")))
                .checkInDate(date(body.get("checkInDate"))).checkOutDate(date(body.get("checkOutDate")))
                .rooms(num(body.get("rooms"))).guests(num(body.get("guests"))).message(str(body.get("message"))).build();
            GroupEnquiry saved = enquiries.submit(hotelId, req);
            return ResponseEntity.ok(ApiResponse.ok("Enquiry sent", Map.of("enquiryId", saved.getId(),
                "reference", saved.getId().toString().substring(0, 8).toUpperCase(Locale.ROOT))));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/api/v1/pms/group-enquiries/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<GroupEnquiry>>> list(@PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(enquiries.list(hotelId)));
    }

    @PutMapping("/api/v1/pms/group-enquiries/{id}")
    public ResponseEntity<ApiResponse<GroupEnquiry>> update(@PathVariable UUID id, @RequestBody Map<String, String> body,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        GroupEnquiry e = enquiryRepo.findById(id).orElse(null);
        if (e == null) return ResponseEntity.notFound().build();
        if (!hotelServiceClient.hasAccess(e.getHotelId(), uid, role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        try {
            return ResponseEntity.ok(ApiResponse.ok("Updated", enquiries.update(e, body.get("status"), body.get("staffNotes"))));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
        }
    }

    /** Creates the reservation group for this enquiry (once) and marks it won. */
    @PostMapping("/api/v1/pms/group-enquiries/{id}/convert")
    public ResponseEntity<ApiResponse<GroupEnquiry>> convert(@PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        GroupEnquiry e = enquiryRepo.findById(id).orElse(null);
        if (e == null) return ResponseEntity.notFound().build();
        if (!hotelServiceClient.hasAccess(e.getHotelId(), uid, role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Group created", enquiries.convert(e, uid)));
    }

    private static String str(Object o) { return o == null ? null : o.toString(); }
    private static Integer num(Object o) {
        try { return o == null || o.toString().isBlank() ? null : Integer.valueOf(o.toString().trim()); }
        catch (NumberFormatException e) { throw new IllegalArgumentException("Rooms and guests must be numbers"); }
    }
    private static java.time.LocalDate date(Object o) {
        try { return o == null ? null : java.time.LocalDate.parse(o.toString()); }
        catch (Exception e) { throw new IllegalArgumentException("Dates must be YYYY-MM-DD"); }
    }
}
