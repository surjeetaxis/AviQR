package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.AddOn;
import in.aviqr.pms.entity.FolioCharge;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.service.AddOnService;
import in.aviqr.pms.service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class AddOnController {

    private final AddOnService addOnService;
    private final ReservationService reservationService;
    private final HotelServiceClient hotelServiceClient;

    @PostMapping("/api/v1/pms/addons")
    public ResponseEntity<ApiResponse<AddOn>> create(
            @RequestBody AddOn req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(req.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Created", addOnService.create(req)));
    }

    @GetMapping("/api/v1/pms/addons/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<AddOn>>> listForHotel(
            @PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(addOnService.listForHotel(hotelId)));
    }

    @PutMapping("/api/v1/pms/addons/{id}")
    public ResponseEntity<ApiResponse<AddOn>> update(
            @PathVariable UUID id, @RequestBody AddOn req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        AddOn existing = addOnService.get(id);
        if (!hotelServiceClient.hasAccess(existing.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Updated", addOnService.update(id, req)));
    }

    @PostMapping("/api/v1/pms/reservations/{reservationId}/addons/{addOnId}")
    public ResponseEntity<ApiResponse<FolioCharge>> applyToReservation(
            @PathVariable UUID reservationId, @PathVariable UUID addOnId,
            @RequestParam(defaultValue="1") int quantity,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Reservation reservation = reservationService.get(reservationId);
        if (!hotelServiceClient.hasAccess(reservation.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Add-on applied", addOnService.applyToReservation(reservationId, addOnId, quantity)));
    }
}
