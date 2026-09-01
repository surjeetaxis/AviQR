package in.aviqr.auth.controller;

import in.aviqr.auth.dto.ApiResponse;
import in.aviqr.auth.dto.ImpersonationTokenResponse;
import in.aviqr.auth.dto.NearbyCustomerResponse;
import in.aviqr.auth.repository.CustomerAddressRepository;
import in.aviqr.auth.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
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
    private final CustomerAddressRepository addressRepo;

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

    // Used by shop-mall-service's CampaignService to resolve a NEARBY-audience
    // promotion campaign: customers whose default saved address falls within
    // radiusKm of the shop's own lat/lng. Secret-gated only (no X-User-Role
    // check) — same trust level as notification-report-review-service's
    // SmsController, since the caller here is a service, not an acting agent.
    @GetMapping("/nearby-customers")
    public ResponseEntity<ApiResponse<List<NearbyCustomerResponse>>> nearbyCustomers(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "10") double radiusKm,
            @RequestHeader(value = "X-Internal-Secret", required = false) String secret) {

        if (!internalSyncSecret.isBlank() && !internalSyncSecret.equals(secret))
            return ResponseEntity.status(401).body(ApiResponse.error("Invalid internal secret"));

        List<NearbyCustomerResponse> result = addressRepo.findNearby(lat, lng, radiusKm).stream()
            .map(row -> NearbyCustomerResponse.builder()
                .userId((UUID) row[0])
                .name((String) row[1])
                .email((String) row[2])
                .phone((String) row[3])
                .distanceKm(((Number) row[4]).doubleValue())
                .build())
            .toList();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
