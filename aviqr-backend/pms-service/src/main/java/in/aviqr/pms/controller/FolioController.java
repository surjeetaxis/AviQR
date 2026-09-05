package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.FolioCharge;
import in.aviqr.pms.entity.FolioPayment;
import in.aviqr.pms.entity.PaymentMethod;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.service.FolioService;
import in.aviqr.pms.service.LoyaltyService;
import in.aviqr.pms.service.ReservationService;
import in.aviqr.pms.service.VoucherService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class FolioController {

    private final FolioService folioService;
    private final ReservationService reservationService;
    private final VoucherService voucherService;
    private final LoyaltyService loyaltyService;
    private final HotelServiceClient hotelServiceClient;

    @GetMapping("/api/v1/pms/reservations/{id}/folio")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getFolio(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Reservation reservation = reservationService.get(id);
        if (!hotelServiceClient.hasAccess(reservation.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(folioService.getFolio(id)));
    }

    @PostMapping("/api/v1/pms/reservations/{id}/folio/charges")
    public ResponseEntity<ApiResponse<FolioCharge>> addCharge(
            @PathVariable UUID id, @RequestBody FolioCharge req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Reservation reservation = reservationService.get(id);
        if (!hotelServiceClient.hasAccess(reservation.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Charge added",
            folioService.addCharge(id, req.getRoomReservationId(), req.getType(), req.getDescription(), req.getAmount())));
    }

    @PostMapping("/api/v1/pms/reservations/{id}/folio/payments")
    public ResponseEntity<ApiResponse<FolioPayment>> addPayment(
            @PathVariable UUID id, @RequestBody FolioPayment req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Reservation reservation = reservationService.get(id);
        if (!hotelServiceClient.hasAccess(reservation.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        // A VOUCHER payment's reference carries the voucher code — validate and deduct
        // its balance before recording the payment, so a bad/insufficient code never
        // gets recorded as if it were real money received.
        if (req.getMethod() == PaymentMethod.VOUCHER) {
            voucherService.redeem(reservation.getHotelId(), req.getReference(), req.getAmount());
        }
        // A LOYALTY_POINTS payment deducts the guest's points balance at the program's
        // configured redemption value — same fail-before-recording shape as VOUCHER.
        if (req.getMethod() == PaymentMethod.LOYALTY_POINTS) {
            loyaltyService.redeemPoints(reservation.getHotelId(), reservation.getGuestId(), req.getAmount());
        }
        return ResponseEntity.ok(ApiResponse.ok("Payment recorded",
            folioService.addPayment(id, req.getMethod(), req.getAmount(), req.getReference(), uid)));
    }
}
