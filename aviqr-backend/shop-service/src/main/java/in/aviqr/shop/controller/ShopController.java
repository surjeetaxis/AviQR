package in.aviqr.shop.controller;
import in.aviqr.shop.dto.*;
import in.aviqr.shop.entity.ShopStatus;
import in.aviqr.shop.service.SellerTierService;
import in.aviqr.shop.service.ShopService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController @RequestMapping("/api/v1/shops") @RequiredArgsConstructor
public class ShopController {
    private final ShopService service;
    private final SellerTierService tierService;

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
    public ResponseEntity<?> update(
            @PathVariable UUID id, @Valid @RequestBody ShopRequest req,
            @RequestHeader("X-User-Role") String role,
            @RequestHeader(value="X-Shop-Id", required=false) String callerShopId) {
        boolean allowed = "ADMIN".equals(role)
            || (id.toString().equals(callerShopId) && java.util.Set.of("OWNER", "MANAGER").contains(role));
        if (!allowed) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Updated", service.update(id, req)));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> status(
            @PathVariable UUID id, @RequestParam String status,
            @RequestHeader("X-User-Role") String callerRole) {
        if (!"ADMIN".equals(callerRole))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        service.updateStatus(id, ShopStatus.valueOf(status.toUpperCase()));
        return ResponseEntity.ok(ApiResponse.ok("Status updated", null));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ShopResponse>>> list(
            @RequestParam(required=false) String search,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="20") int size,
            @RequestParam(required=false) String sort) {
        int clampedSize = switch (size) { case 10, 20, 50, 100 -> size; default -> 20; };
        Page<ShopResponse> result = search != null
            ? service.search(search, page, clampedSize, sort)
            : service.listAll(page, clampedSize, sort);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // Admin/ops trigger — normally runs nightly via @Scheduled, exposed here
    // so tiers can be recalculated on demand without waiting for the cron.
    @PostMapping("/admin/recalculate-tiers")
    public ResponseEntity<ApiResponse<Void>> recalculateTiers(@RequestHeader("X-User-Role") String callerRole) {
        if (!"ADMIN".equals(callerRole))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        tierService.recalculateAllTiers();
        return ResponseEntity.ok(ApiResponse.ok("Tier recalculation triggered", null));
    }
}