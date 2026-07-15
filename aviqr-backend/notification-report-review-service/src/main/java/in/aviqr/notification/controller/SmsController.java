package in.aviqr.notification.controller;

import in.aviqr.notification.dto.ApiResponse;
import in.aviqr.notification.service.TwilioSmsService;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * Internal service-to-service endpoint used by shop-mall-service's campaign
 * dispatcher to send a single SMS (no customer-facing auth — same trust model
 * as other internal cross-service calls in this codebase, e.g. SellerTierService).
 */
@RestController
@RequestMapping("/api/v1/notifications/sms")
@RequiredArgsConstructor
public class SmsController {

    private final TwilioSmsService smsService;

    @PostMapping("/send")
    public ApiResponse<Boolean> send(@RequestBody SendRequest req) {
        boolean sent = smsService.send(req.getPhone(), req.getMessage());
        return sent ? ApiResponse.ok("Sent", true) : ApiResponse.error("SMS send failed");
    }

    @Data
    static class SendRequest {
        @NotBlank private String phone;
        @NotBlank private String message;
    }
}
