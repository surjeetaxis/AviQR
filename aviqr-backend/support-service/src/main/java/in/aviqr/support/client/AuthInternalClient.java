package in.aviqr.support.client;

import in.aviqr.support.dto.ApiResponse;
import in.aviqr.support.dto.ImpersonationTokenResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.ResolvableType;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

// Trusted internal calls into auth-service — same cross-service RestTemplate
// pattern already used by shop-mall-service's BrandController/CampaignService
// (plain "http://<service-name>/..." resolved by the @LoadBalanced RestTemplate
// bean via Eureka, never routed through api-gateway).
@Component
@RequiredArgsConstructor
@Slf4j
public class AuthInternalClient {

    private final RestTemplate restTemplate;

    @Value("${internal.sync.secret:}")
    private String internalSyncSecret;

    public ImpersonationTokenResponse mintImpersonationToken(String targetUserId, String agentId, String callerRole) {
        String url = "http://auth-service/api/v1/auth/internal/impersonation-token";

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Role", callerRole);
        if (!internalSyncSecret.isBlank()) headers.set("X-Internal-Secret", internalSyncSecret);

        Map<String, String> body = Map.of("targetUserId", targetUserId, "agentId", agentId);

        ParameterizedTypeReference<ApiResponse<ImpersonationTokenResponse>> ref = ParameterizedTypeReference.forType(
                ResolvableType.forClassWithGenerics(ApiResponse.class, ImpersonationTokenResponse.class).getType());

        ResponseEntity<ApiResponse<ImpersonationTokenResponse>> resp = restTemplate.exchange(
                url, HttpMethod.POST, new HttpEntity<>(body, headers), ref);

        if (resp.getBody() == null || resp.getBody().getData() == null)
            throw new RuntimeException("auth-service did not return an impersonation token");
        return resp.getBody().getData();
    }

    public void revokeSession(String targetUserId, String sessionId, String callerId, String callerRole) {
        String url = "http://auth-service/api/v1/auth/admin/users/" + targetUserId + "/sessions/" + sessionId + "/revoke";

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", callerId);
        headers.set("X-User-Role", callerRole);

        try {
            restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(headers), Void.class);
        } catch (Exception e) {
            log.warn("Failed to revoke impersonation session {} for user {}: {}", sessionId, targetUserId, e.getMessage());
        }
    }
}
