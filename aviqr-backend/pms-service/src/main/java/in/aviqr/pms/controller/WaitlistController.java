package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.Waitlist;
import in.aviqr.pms.service.WaitlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class WaitlistController {

    private final WaitlistService waitlistService;
    private final HotelServiceClient hotelServiceClient;

    @PostMapping("/api/v1/pms/hotels/{hotelId}/waitlist")
    public ResponseEntity<ApiResponse<Waitlist>> join(
            @PathVariable UUID hotelId, @RequestBody Map<String, String> body,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        UUID roomTypeId = UUID.fromString(body.get("roomTypeId"));
        LocalDate checkIn = LocalDate.parse(body.get("checkInDate"));
        LocalDate checkOut = LocalDate.parse(body.get("checkOutDate"));
        Waitlist entry = waitlistService.join(hotelId, roomTypeId, body.get("guestName"), body.get("guestPhone"), checkIn, checkOut);
        return ResponseEntity.ok(ApiResponse.ok("Added to waitlist", entry));
    }

    @GetMapping("/api/v1/pms/hotels/{hotelId}/waitlist")
    public ResponseEntity<ApiResponse<List<Waitlist>>> list(
            @PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Waitlist", waitlistService.list(hotelId)));
    }
}
