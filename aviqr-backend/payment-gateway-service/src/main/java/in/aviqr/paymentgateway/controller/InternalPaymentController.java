package in.aviqr.paymentgateway.controller;

import in.aviqr.paymentgateway.dto.ApiResponse;
import in.aviqr.paymentgateway.gateway.GatewayException;
import in.aviqr.paymentgateway.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/** Server-to-server API for other AviQR services (pms-service). The "/internal/" path is only
 *  reachable with X-Internal-Secret; ServiceTrustConfiguration rejects it through the gateway. */
@RestController @RequiredArgsConstructor
@RequestMapping("/api/v1/payment-gateway/internal")
public class InternalPaymentController {
    private final PaymentService payments;

    @GetMapping("/hotels/{hotelId}/checkout-option")
    public ResponseEntity<ApiResponse<Map<String, Object>>> option(@PathVariable UUID hotelId) {
        return ResponseEntity.ok(ApiResponse.ok(payments.checkoutOption(hotelId).orElse(null)));
    }

    @PostMapping("/transactions")
    public ResponseEntity<ApiResponse<PaymentService.TransactionView>> create(@RequestBody PaymentService.CreateRequest req) {
        try {
            return ResponseEntity.ok(ApiResponse.ok(payments.create(req)));
        } catch (GatewayException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/transactions/{id}")
    public ResponseEntity<ApiResponse<PaymentService.TransactionView>> get(@PathVariable UUID id) {
        return payments.get(id).map(t -> ResponseEntity.ok(ApiResponse.ok(t)))
            .orElseGet(() -> ResponseEntity.status(404).body(ApiResponse.error("Payment not found")));
    }
}
