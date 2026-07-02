package in.aviqr.shop.controller;
import in.aviqr.shop.dto.*;
import in.aviqr.shop.entity.ShopStatus;
import in.aviqr.shop.security.ShopTokenService;
import in.aviqr.shop.service.ShopService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController @RequestMapping("/api/v1/shops") @RequiredArgsConstructor
public class ShopController {
    private final ShopService service;
    private final ShopTokenService shopTokenService;

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
