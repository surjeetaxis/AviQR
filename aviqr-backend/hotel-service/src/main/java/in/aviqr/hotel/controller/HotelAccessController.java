package in.aviqr.hotel.controller;
import in.aviqr.hotel.dto.ApiResponse;
import in.aviqr.hotel.dto.HotelAccessResponse;
import in.aviqr.hotel.entity.*;
import in.aviqr.hotel.repository.*;
import in.aviqr.hotel.service.HotelAccessService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.ResolvableType;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import java.util.*;

@RestController @RequiredArgsConstructor @Slf4j
public class HotelAccessController {
    private static final String USER_LOOKUP_URL = "http://auth-service/api/v1/auth/internal/users/lookup";

    private final HotelAccessRepository accessRepo;
    private final HotelRepository hotelRepo;
    private final HotelOutletRepository outletRepo;
    private final HotelAccessService accessService;
    private final RestTemplate restTemplate;

    @Value("${internal.sync.secret:}")
    private String internalSyncSecret;

    // Owner-only: hasAccess() is satisfied by ANY access row (including a
    // single-outlet-scoped STAFF/OUTLET_MANAGER grant), which previously let
    // any staff member grant themselves — or anyone else — OWNER access to the
    // whole hotel. Managing who has access is a strictly more sensitive action
    // than using the features that access unlocks, so it needs its own,
    // stricter check.
    @PostMapping("/api/v1/hotels/{id}/access")
    public ResponseEntity<ApiResponse<HotelAccess>> grant(
            @PathVariable UUID id, @RequestBody HotelAccess req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!accessService.isOwner(id, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Only the hotel owner can grant access"));
        if (!hotelRepo.existsById(id)) return ResponseEntity.notFound().build();
        req.setId(null);
        req.setHotelId(id);
        return ResponseEntity.ok(ApiResponse.ok("Access granted", accessRepo.save(req)));
    }

    @GetMapping("/api/v1/hotels/{id}/access")
    public ResponseEntity<ApiResponse<List<HotelAccessResponse>>> list(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!accessService.hasAccess(id, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));

        List<HotelAccess> rows = accessRepo.findByHotelId(id);

        Map<String, in.aviqr.hotel.dto.UserLookupDto> usersById = lookupUsers(rows);
        Map<UUID, String> outletNames = new HashMap<>();
        rows.stream().map(HotelAccess::getOutletId).filter(Objects::nonNull).distinct()
            .forEach(oid -> outletRepo.findById(oid).ifPresent(o -> outletNames.put(oid, o.getName())));

        List<HotelAccessResponse> result = rows.stream().map(a -> {
            var u = usersById.get(a.getUserId());
            return HotelAccessResponse.builder()
                .id(a.getId()).userId(a.getUserId())
                .userName(u != null ? u.getName() : null)
                .userEmail(u != null ? u.getEmail() : null)
                .role(a.getRole())
                .outletId(a.getOutletId())
                .outletName(a.getOutletId() != null ? outletNames.get(a.getOutletId()) : null)
                .createdAt(a.getCreatedAt())
                .build();
        }).toList();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // Best-effort: an unreachable/erroring auth-service must not break the
    // staff list itself, just leave names unresolved (frontend falls back to
    // showing the raw userId, same as before this enrichment existed).
    private Map<String, in.aviqr.hotel.dto.UserLookupDto> lookupUsers(List<HotelAccess> rows) {
        List<String> ids = rows.stream().map(HotelAccess::getUserId).filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) return Map.of();
        try {
            String url = UriComponentsBuilder.fromHttpUrl(USER_LOOKUP_URL)
                .queryParam("ids", String.join(",", ids)).toUriString();
            HttpHeaders headers = new HttpHeaders();
            if (!internalSyncSecret.isBlank()) headers.set("X-Internal-Secret", internalSyncSecret);
            ParameterizedTypeReference<ApiResponse<in.aviqr.hotel.dto.UserLookupDto[]>> ref =
                ParameterizedTypeReference.forType(ResolvableType.forClassWithGenerics(
                    ApiResponse.class, in.aviqr.hotel.dto.UserLookupDto[].class).getType());
            ResponseEntity<ApiResponse<in.aviqr.hotel.dto.UserLookupDto[]>> resp =
                restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), ref);
            var data = resp.getBody() != null ? resp.getBody().getData() : null;
            if (data == null) return Map.of();
            Map<String, in.aviqr.hotel.dto.UserLookupDto> byId = new HashMap<>();
            for (var u : data) byId.put(u.getId().toString(), u);
            return byId;
        } catch (Exception e) {
            log.warn("User lookup for hotel staff list failed: {}", e.getMessage());
            return Map.of();
        }
    }

    @DeleteMapping("/api/v1/hotels/{id}/access/{accessId}")
    public ResponseEntity<ApiResponse<Void>> revoke(
            @PathVariable UUID id, @PathVariable UUID accessId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!accessService.isOwner(id, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Only the hotel owner can revoke access"));
        accessRepo.findById(accessId).filter(a -> a.getHotelId().equals(id)).ifPresent(accessRepo::delete);
        return ResponseEntity.ok(ApiResponse.ok("Revoked", null));
    }

    // Multi-property dashboard: every hotel this user has any access row for.
    @GetMapping("/api/v1/owners/{userId}/hotels")
    public ResponseEntity<ApiResponse<List<Hotel>>> hotelsForOwner(@PathVariable String userId) {
        List<UUID> hotelIds = accessRepo.findByUserId(userId).stream().map(HotelAccess::getHotelId).distinct().toList();
        return ResponseEntity.ok(ApiResponse.ok(hotelRepo.findAllById(hotelIds)));
    }
}
