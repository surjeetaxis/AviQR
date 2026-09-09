package in.aviqr.pms.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Resolves raw user-id strings (e.g. RateChangeLog.changedBy) into names/emails via
 * auth-service's internal lookup endpoint — same cross-service-call convention as
 * HotelServiceClient, and the same endpoint hotel-service's HotelAccessController
 * already uses to enrich the Hotel Staff access list.
 */
@Service @RequiredArgsConstructor @Slf4j
public class AuthServiceClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${auth.service.url:http://auth-service}")
    private String authServiceUrl;

    @Value("${internal.sync.secret:}")
    private String internalSyncSecret;

    /** Best-effort: an unreachable/erroring auth-service must not break whatever list is
     *  being enriched — callers just see the raw ids they already had. */
    public Map<String, UserLookupDto> lookupUsers(List<String> ids) {
        List<String> distinct = ids.stream().filter(Objects::nonNull).distinct().toList();
        if (distinct.isEmpty()) return Map.of();
        try {
            String url = UriComponentsBuilder
                .fromHttpUrl(authServiceUrl + "/api/v1/auth/internal/users/lookup")
                .queryParam("ids", String.join(",", distinct)).toUriString();
            HttpHeaders headers = new HttpHeaders();
            if (!internalSyncSecret.isBlank()) headers.set("X-Internal-Secret", internalSyncSecret);
            ResponseEntity<Map> resp = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            Object data = resp.getBody() != null ? resp.getBody().get("data") : null;
            if (data == null) return Map.of();
            List<UserLookupDto> users = objectMapper.convertValue(data, objectMapper.getTypeFactory()
                .constructCollectionType(List.class, UserLookupDto.class));
            Map<String, UserLookupDto> byId = new HashMap<>();
            for (UserLookupDto u : users) byId.put(u.getId().toString(), u);
            return byId;
        } catch (Exception e) {
            log.warn("User lookup failed: {}", e.getMessage());
            return Map.of();
        }
    }
}
