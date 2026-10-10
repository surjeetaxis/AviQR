package in.aviqr.paymentgateway.controller;

import in.aviqr.paymentgateway.client.HotelAccessClient;
import in.aviqr.paymentgateway.dto.ApiResponse;
import in.aviqr.paymentgateway.gateway.*;
import in.aviqr.paymentgateway.service.AccountService;
import in.aviqr.paymentgateway.service.GatewayRegistry;
import in.aviqr.paymentgateway.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/** Hotel staff set up their merchant accounts and review online payments. */
@RestController @RequiredArgsConstructor
@RequestMapping("/api/v1/payment-gateway")
public class GatewayAccountController {
    private final AccountService accountService;
    private final PaymentService payments;
    private final GatewayRegistry registry;
    private final HotelAccessClient access;

    public record GatewayInfo(PaymentGateway gateway, String label, List<CredentialField> fields, String verification, String unsupportedReason) { }
    public record SaveAccount(Map<String, String> settings, Boolean testMode, Boolean active) { }

    @GetMapping("/gateways")
    public ResponseEntity<ApiResponse<List<GatewayInfo>>> gateways() {
        return ResponseEntity.ok(ApiResponse.ok(registry.all().stream()
            .map(p -> new GatewayInfo(p.gateway(), p.label(), p.credentialFields(), p.verification().name(), p.unsupportedReason()))
            .sorted(Comparator.comparing(GatewayInfo::label)).toList()));
    }

    @GetMapping("/accounts/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<AccountService.AccountView>>> list(@PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!access.hasAccess(hotelId, uid, role)) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok(accountService.list(hotelId)));
    }

    @PutMapping("/accounts/hotel/{hotelId}/{gateway}")
    public ResponseEntity<ApiResponse<AccountService.AccountView>> save(@PathVariable UUID hotelId, @PathVariable PaymentGateway gateway,
            @RequestBody SaveAccount body,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!access.hasAccess(hotelId, uid, role)) return forbidden();
        try {
            return ResponseEntity.ok(ApiResponse.ok("Saved", accountService.save(hotelId, gateway, body.settings(),
                Boolean.TRUE.equals(body.testMode()), !Boolean.FALSE.equals(body.active()))));
        } catch (GatewayException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/accounts/hotel/{hotelId}/{gateway}/preferred")
    public ResponseEntity<ApiResponse<List<AccountService.AccountView>>> prefer(@PathVariable UUID hotelId, @PathVariable PaymentGateway gateway,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!access.hasAccess(hotelId, uid, role)) return forbidden();
        try {
            accountService.prefer(hotelId, gateway);
            return ResponseEntity.ok(ApiResponse.ok(accountService.list(hotelId)));
        } catch (GatewayException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/accounts/hotel/{hotelId}/{gateway}")
    public ResponseEntity<ApiResponse<Boolean>> remove(@PathVariable UUID hotelId, @PathVariable PaymentGateway gateway,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!access.hasAccess(hotelId, uid, role)) return forbidden();
        accountService.remove(hotelId, gateway);
        return ResponseEntity.ok(ApiResponse.ok("Removed", true));
    }

    @GetMapping("/transactions/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<PaymentService.TransactionView>>> transactions(@PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!access.hasAccess(hotelId, uid, role)) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok(payments.recent(hotelId)));
    }

    /** Confirm or reject a payment the gateway couldn't prove, after checking its dashboard. */
    @PutMapping("/transactions/{id}/resolve")
    public ResponseEntity<ApiResponse<PaymentService.TransactionView>> resolve(@PathVariable UUID id, @RequestParam boolean paid,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        var t = payments.get(id).orElse(null);
        if (t == null) return ResponseEntity.status(404).body(ApiResponse.error("Payment not found"));
        if (!access.hasAccess(t.hotelId(), uid, role)) return forbidden();
        try {
            return ResponseEntity.ok(ApiResponse.ok(payments.resolve(id, paid, uid)));
        } catch (GatewayException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    private static <T> ResponseEntity<ApiResponse<T>> forbidden() {
        return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
    }
}
