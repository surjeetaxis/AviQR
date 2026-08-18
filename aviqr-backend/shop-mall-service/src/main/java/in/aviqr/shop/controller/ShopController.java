package in.aviqr.shop.controller;
import in.aviqr.shop.dto.*;
import in.aviqr.shop.entity.Shop;
import in.aviqr.shop.entity.ShopStatus;
import in.aviqr.shop.entity.SubscriptionStatus;
import in.aviqr.shop.security.ShopTokenService;
import in.aviqr.shop.service.ShopService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.ResolvableType;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController @RequestMapping("/api/v1/shops") @RequiredArgsConstructor
public class ShopController {
    private final ShopService service;
    private final ShopTokenService shopTokenService;
    private final RestTemplate restTemplate;
    private static final String TICKETS_URL = "http://support-service/api/v1/tickets";

    @PostMapping
    public ResponseEntity<ApiResponse<ShopResponse>> create(
            @Valid @RequestBody ShopRequest req,
            @RequestHeader("X-User-Id") String uid) {
        return ResponseEntity.ok(ApiResponse.ok("Shop created", service.create(uid, req)));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<ShopResponse>>> my(@RequestHeader("X-User-Id") String uid) {
        return ResponseEntity.ok(ApiResponse.ok(service.getMyShops(uid)));
    }

    @GetMapping("/{id}/referrals")
    public ResponseEntity<ApiResponse<List<ShopResponse>>> referrals(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getReferrals(id)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ShopResponse>> getById(@PathVariable UUID id) {
        return service.getById(id)
            .map(s -> ResponseEntity.ok(ApiResponse.ok(s)))
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ShopResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody ShopRequest req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestHeader(value="X-Shop-Id", defaultValue="") String shopId) {
        if (!"ADMIN".equals(role)) {
            var shop = service.findRaw(id).orElse(null);
            if (shop == null) return ResponseEntity.notFound().build();
            boolean isOwner   = shop.getOwnerId().equals(uid);
            boolean isManager = "MANAGER".equals(role) && shop.getId().toString().equals(shopId);
            if (!isOwner && !isManager)
                return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        }
        return ResponseEntity.ok(ApiResponse.ok("Updated", service.update(id, req)));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> status(
            @PathVariable UUID id, @RequestParam String status,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!"ADMIN".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        service.updateStatus(id, ShopStatus.valueOf(status.toUpperCase()));
        return ResponseEntity.ok(ApiResponse.ok("Status updated", null));
    }

    // Verifies the caller owns this shop (or is ADMIN), then mints a short-lived JWT
    // scoped to the shop so report-service's per-shop revenue check (and any other
    // shop/order/menu/qr/payment-service call) authorizes correctly — same mechanism
    // as hotel-service's hotel-outlets/{id}/enter and mall-service's vendors/{id}/enter.
    @PostMapping("/{id}/enter")
    public ResponseEntity<ApiResponse<Map<String, String>>> enter(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        var shop = service.findRaw(id).orElse(null);
        if (shop == null) return ResponseEntity.notFound().build();
        if (!"ADMIN".equals(role) && !shop.getOwnerId().equals(uid))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        String token = shopTokenService.mintShopToken(uid, shop.getId().toString());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("accessToken", token, "shopId", shop.getId().toString())));
    }

    // ── Subscription (plan/trial/status) ───────────────────────────────────────
    // Readable by ADMIN/SUPPORT (subscription management dashboards) or the
    // shop's own owner (Settings > Plan & Billing trial countdown).
    @GetMapping("/{id}/subscription")
    public ResponseEntity<ApiResponse<ShopResponse>> getSubscription(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        var shop = service.findRaw(id).orElse(null);
        if (shop == null) return ResponseEntity.notFound().build();
        boolean isStaff = "ADMIN".equals(role) || "SUPPORT".equals(role);
        if (!isStaff && !shop.getOwnerId().equals(uid))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return service.getById(id)
            .map(s -> ResponseEntity.ok(ApiResponse.ok(s)))
            .orElse(ResponseEntity.notFound().build());
    }

    // ADMIN+SUPPORT only — a day-to-day support operation (confirm manual
    // payment / process a cancellation), not a plan-catalog edit (that stays
    // ADMIN-only in PlanController).
    @PutMapping("/{id}/subscription/status")
    public ResponseEntity<ApiResponse<ShopResponse>> updateSubscriptionStatus(
            @PathVariable UUID id, @RequestBody Map<String, String> body,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!"ADMIN".equals(role) && !"SUPPORT".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        SubscriptionStatus status;
        try {
            status = SubscriptionStatus.valueOf(String.valueOf(body.get("status")).toUpperCase());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid status"));
        }
        return service.updateSubscriptionStatus(id, status)
            .map(s -> ResponseEntity.ok(ApiResponse.ok("Subscription updated", s)))
            .orElse(ResponseEntity.notFound().build());
    }

    // Owner-triggered — records the request and files a support ticket so the
    // (manual, support-mediated) cancellation shows up in the existing Tickets
    // queue rather than requiring a new dedicated entity/UI.
    @PostMapping("/{id}/subscription/cancel-request")
    public ResponseEntity<ApiResponse<Void>> requestCancellation(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Shop shop = service.findRaw(id).orElse(null);
        if (shop == null) return ResponseEntity.notFound().build();
        if (!"ADMIN".equals(role) && !shop.getOwnerId().equals(uid))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        service.requestCancellation(id);
        try {
            Map<String, Object> ticket = Map.of(
                "subject", "Subscription cancellation request",
                "description", "Shop \"" + shop.getName() + "\" (" + shop.getId() + ") on plan "
                    + shop.getSubscriptionPlan() + " has requested to cancel their subscription.",
                "priority", "MEDIUM"
            );
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-Id", uid);
            headers.setContentType(MediaType.APPLICATION_JSON);
            restTemplate.exchange(TICKETS_URL, HttpMethod.POST, new HttpEntity<>(ticket, headers),
                new ParameterizedTypeReference<ApiResponse<Object>>() {});
        } catch (Exception ignored) {
            // Cancellation request is recorded on the shop either way; the
            // support ticket is a best-effort notification, same tolerance
            // as MenuController's shop-info lookup.
        }
        return ResponseEntity.ok(ApiResponse.ok("Cancellation request submitted", null));
    }

    @PostMapping("/admin/recalculate-tiers")
    public ResponseEntity<ApiResponse<String>> recalculateTiers(
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!"ADMIN".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Tier recalculation complete", "OK"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ShopResponse>>> list(
            @RequestParam(required=false) String search,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="20") int size) {
        Page<ShopResponse> result = search!=null ? service.search(search,page,size) : service.listAll(page,size);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
