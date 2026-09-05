package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.client.PaymentServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.PaymentMethod;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.service.FolioService;
import in.aviqr.pms.service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/** Online payment + card pre-authorization on a reservation's folio, via
 *  payment-service's existing Razorpay integration (see PaymentServiceClient).
 *  Staff-initiated (front desk holds/charges the card on file) — the actual
 *  card entry happens in Razorpay's own checkout widget on the frontend, this
 *  only orchestrates order creation / verification / capture. */
@RestController @RequiredArgsConstructor
public class PaymentGatewayController {

    private final PaymentServiceClient paymentServiceClient;
    private final HotelServiceClient hotelServiceClient;
    private final ReservationService reservationService;
    private final FolioService folioService;

    private Reservation authorize(UUID reservationId, String uid, String role) {
        Reservation reservation = reservationService.get(reservationId);
        if (!hotelServiceClient.hasAccess(reservation.getHotelId(), uid, role))
            throw new AccessDeniedException();
        return reservation;
    }
    private static class AccessDeniedException extends RuntimeException {}

    @PostMapping("/api/v1/pms/reservations/{id}/pre-auth")
    public ResponseEntity<ApiResponse<Map<String,Object>>> createPreAuth(
            @PathVariable UUID id, @RequestBody Map<String, BigDecimal> body,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Reservation reservation;
        try { reservation = authorize(id, uid, role); }
        catch (AccessDeniedException e) { return ResponseEntity.status(403).body(ApiResponse.error("Forbidden")); }
        BigDecimal amount = body.get("amount");
        if (amount == null || amount.signum() <= 0)
            return ResponseEntity.badRequest().body(ApiResponse.error("A positive amount is required"));
        return ResponseEntity.ok(ApiResponse.ok(paymentServiceClient.createOrder(reservation.getHotelId(), id, amount, true)));
    }

    @PostMapping("/api/v1/pms/reservations/{id}/pre-auth/verify")
    public ResponseEntity<ApiResponse<Map<String,Object>>> verifyPreAuth(
            @PathVariable UUID id, @RequestBody Map<String,String> body,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        try { authorize(id, uid, role); }
        catch (AccessDeniedException e) { return ResponseEntity.status(403).body(ApiResponse.error("Forbidden")); }
        return ResponseEntity.ok(ApiResponse.ok(paymentServiceClient.verify(
            body.get("razorpayOrderId"), body.get("razorpayPaymentId"), body.get("razorpaySignature"), id)));
    }

    @GetMapping("/api/v1/pms/reservations/{id}/pre-auth")
    public ResponseEntity<ApiResponse<Map<String,Object>>> getPreAuth(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        try { authorize(id, uid, role); }
        catch (AccessDeniedException e) { return ResponseEntity.status(403).body(ApiResponse.error("Forbidden")); }
        return ResponseEntity.ok(ApiResponse.ok(paymentServiceClient.getByReservation(id).orElse(null)));
    }

    /** Settles a held pre-auth and posts the captured amount as a CARD payment on
     *  the folio — the natural checkout-time action for a card authorized at
     *  booking/check-in. */
    @PostMapping("/api/v1/pms/reservations/{id}/pre-auth/capture")
    public ResponseEntity<ApiResponse<Map<String,Object>>> capturePreAuth(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Reservation reservation;
        try { reservation = authorize(id, uid, role); }
        catch (AccessDeniedException e) { return ResponseEntity.status(403).body(ApiResponse.error("Forbidden")); }
        var existing = paymentServiceClient.getByReservation(id)
            .orElseThrow(() -> new RuntimeException("No pre-authorized hold on file for this reservation"));
        String paymentId = (String) existing.get("paymentId");
        Map<String,Object> captured = paymentServiceClient.capture(paymentId, reservation.getHotelId(), uid, role);
        BigDecimal amount = new BigDecimal(captured.get("amount").toString());
        folioService.addPayment(id, PaymentMethod.CARD, amount, "Razorpay " + paymentId, uid);
        return ResponseEntity.ok(ApiResponse.ok("Card charged and posted to folio", captured));
    }
}
