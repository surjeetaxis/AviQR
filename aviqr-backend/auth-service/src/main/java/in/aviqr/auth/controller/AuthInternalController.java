package in.aviqr.auth.controller;

import in.aviqr.auth.dto.ApiResponse;
import in.aviqr.auth.dto.ImpersonationTokenResponse;
import in.aviqr.auth.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

// Service-to-service only — called directly (bypassing api-gateway, same as every
// other internal RestTemplate call in this codebase, e.g. shop-mall-service's
// BrandController/CampaignService) by support-service to mint a real login token
// for "log in as this customer" impersonation. Never routed through the gateway,
// so trust here is enforced two ways: the caller must forward the acting agent's
// X-User-Role (SUPPORT/ADMIN — the same header the gateway would have injected for
// them), AND, if configured, a shared X-Internal-Secret, matching the existing
// internal.sync.secret pattern already used by notification-report-review-service's
// SmsController.
@RestController
@RequestMapping("/api/v1/auth/internal")
@RequiredArgsConstructor
public class AuthInternalController {

    private final AuthService authService;

    @Value("${internal.sync.secret:}")
    private String internalSyncSecret;

    @PostMapping("/impersonation-token")
    public ResponseEntity<ApiResponse<ImpersonationTokenResponse>> impersonationToken(
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String callerRole,
            @RequestHeader(value = "X-Internal-Secret", required = false) String secret) {

        if (!internalSyncSecret.isBlank() && !internalSyncSecret.equals(secret))
            return ResponseEntity.status(401).body(ApiResponse.error("Invalid internal secret"));
        if (!"SUPPORT".equals(callerRole) && !"ADMIN".equals(callerRole))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));

        String targetUserId = body.get("targetUserId");
        String agentId = body.get("agentId");
        if (targetUserId == null || agentId == null)
            return ResponseEntity.badRequest().body(ApiResponse.error("targetUserId and agentId are required"));

        return ResponseEntity.ok(ApiResponse.ok(
                authService.mintImpersonationToken(UUID.fromString(targetUserId), agentId)));
    }
}
