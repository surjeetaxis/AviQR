package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.DiscountPackage;
import in.aviqr.pms.entity.FolioCharge;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.service.DiscountService;
import in.aviqr.pms.service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class DiscountController {

    private final DiscountService discountService;
    private final ReservationService reservationService;
    private final HotelServiceClient hotelServiceClient;

    @PostMapping("/api/v1/pms/discounts")
    public ResponseEntity<ApiResponse<DiscountPackage>> create(
            @RequestBody DiscountPackage req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(req.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Created", discountService.create(req)));
    }

    @GetMapping("/api/v1/pms/discounts/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<DiscountPackage>>> listForHotel(
            @PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(discountService.listForHotel(hotelId)));
    }

    @PutMapping("/api/v1/pms/discounts/{id}")
    public ResponseEntity<ApiResponse<DiscountPackage>> update(
            @PathVariable UUID id, @RequestBody DiscountPackage req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        DiscountPackage existing = discountService.get(id);
        if (!hotelServiceClient.hasAccess(existing.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Updated", discountService.update(id, req)));
    }

    @PostMapping("/api/v1/pms/reservations/{reservationId}/discounts/{discountId}")
    public ResponseEntity<ApiResponse<FolioCharge>> applyToReservation(
            @PathVariable UUID reservationId, @PathVariable UUID discountId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Reservation reservation = reservationService.get(reservationId);
        if (!hotelServiceClient.hasAccess(reservation.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Discount applied", discountService.applyToReservation(reservationId, discountId)));
    }
}
