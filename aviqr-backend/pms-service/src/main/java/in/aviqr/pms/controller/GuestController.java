package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.Guest;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.service.GuestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class GuestController {

    private final GuestService guestService;
    private final HotelServiceClient hotelServiceClient;

    @GetMapping("/api/v1/pms/guests/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<Guest>>> listForHotel(
            @PathVariable UUID hotelId,
            @RequestParam(required=false) String query,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(guestService.listForHotel(hotelId, query)));
    }

    @GetMapping("/api/v1/pms/guests/{id}")
    public ResponseEntity<ApiResponse<Guest>> get(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Guest guest = guestService.get(id);
        if (!hotelServiceClient.hasAccess(guest.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(guest));
    }

    @PutMapping("/api/v1/pms/guests/{id}")
    public ResponseEntity<ApiResponse<Guest>> update(
            @PathVariable UUID id, @RequestBody Guest req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Guest existing = guestService.get(id);
        if (!hotelServiceClient.hasAccess(existing.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Updated", guestService.update(id, req)));
    }

    @GetMapping("/api/v1/pms/guests/{id}/reservations")
    public ResponseEntity<ApiResponse<List<Reservation>>> stayHistory(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Guest guest = guestService.get(id);
        if (!hotelServiceClient.hasAccess(guest.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(guestService.stayHistory(id)));
    }
}
