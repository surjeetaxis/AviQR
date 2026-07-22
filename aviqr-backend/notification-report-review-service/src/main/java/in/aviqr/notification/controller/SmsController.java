package in.aviqr.notification.controller;

import in.aviqr.notification.dto.ApiResponse;
import in.aviqr.notification.service.TwilioSmsService;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Internal service-to-service endpoint used by shop-mall-service's campaign
 * dispatcher to send a single SMS. Reachable through the public gateway
 * (/api/v1/notifications/** is proxied), so it's gated by a shared secret rather
 * than a user JWT — same pattern as OrderController#paymentSync.
 */
@RestController
@RequestMapping("/api/v1/notifications/sms")
@RequiredArgsConstructor
public class SmsController {

    private final TwilioSmsService smsService;

    @Value("${internal.sync.secret:}")
    private String internalSyncSecret;

    @PostMapping("/send")
    public ResponseEntity<ApiResponse<Boolean>> send(
            @RequestBody SendRequest req,
            @RequestHeader(value = "X-Internal-Secret", required = false) String secret) {
        if (!internalSyncSecret.isBlank() && !internalSyncSecret.equals(secret))
            return ResponseEntity.status(401).body(ApiResponse.error("Invalid secret"));
        boolean sent = smsService.send(req.getPhone(), req.getMessage());
        return ResponseEntity.ok(sent ? ApiResponse.ok("Sent", true) : ApiResponse.error("SMS send failed"));
    }

    @Data
    static class SendRequest {
        @NotBlank private String phone;
        @NotBlank private String message;
    }
}
