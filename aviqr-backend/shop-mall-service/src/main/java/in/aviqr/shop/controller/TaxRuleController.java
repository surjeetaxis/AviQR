package in.aviqr.shop.controller;

import in.aviqr.shop.dto.*;
import in.aviqr.shop.entity.Shop;
import in.aviqr.shop.entity.TaxRule;
import in.aviqr.shop.repository.TaxRuleRepository;
import in.aviqr.shop.service.ShopService;
import in.aviqr.shop.service.TaxRuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController @RequestMapping("/api/v1/tax-rules") @RequiredArgsConstructor
public class TaxRuleController {
    private final TaxRuleRepository repo;
    private final ShopService shopService;
    private final TaxRuleService taxRuleService;

    // Internal/public — resolves the applicable tax rate for a shop, optionally
    // scoped by outlet/service type, menu category, and region override.
    @GetMapping("/resolve/{shopId}")
    public ResponseEntity<ApiResponse<TaxResolution>> resolve(
            @PathVariable String shopId,
            @RequestParam(required = false) String outletType,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String city) {
        return ResponseEntity.ok(ApiResponse.ok(taxRuleService.resolve(shopId, outletType, category, state, city)));
    }

    // Owner/manager (own shop) or ADMIN/SUPPORT — every tax rule for a shop, incl. inactive
    @GetMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<List<TaxRule>>> listByShop(
            @PathVariable String shopId,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId,
            @RequestHeader("X-User-Id") String uid) {
        if (!canView(shopId, role, callerShopId, uid))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(repo.findByShopId(shopId, Sort.by("priority"))));
    }

    @PostMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<TaxRule>> create(
            @PathVariable String shopId,
            @Valid @RequestBody TaxRuleRequest req,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId,
            @RequestHeader("X-User-Id") String uid) {
        if (!canManage(shopId, role, callerShopId, uid))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        TaxRule rule = TaxRule.builder()
            .shopId(shopId)
            .name(req.getName())
            .type(req.getType())
            .state(req.getState())
            .city(req.getCity())
            .outletType(req.getOutletType())
            .category(req.getCategory())
            .taxPercent(req.getTaxPercent())
            .priority(req.getPriority() != null ? req.getPriority() : 100)
            .active(true)
            .build();
        return ResponseEntity.ok(ApiResponse.ok("Tax rule created", repo.save(rule)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TaxRule>> update(
            @PathVariable UUID id,
            @Valid @RequestBody TaxRuleRequest req,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId,
            @RequestHeader("X-User-Id") String uid) {
        TaxRule rule = repo.findById(id).orElse(null);
        if (rule == null) return ResponseEntity.notFound().build();
        if (!canManage(rule.getShopId(), role, callerShopId, uid))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        rule.setName(req.getName());
        rule.setType(req.getType());
        rule.setState(req.getState());
        rule.setCity(req.getCity());
        rule.setOutletType(req.getOutletType());
        rule.setCategory(req.getCategory());
        rule.setTaxPercent(req.getTaxPercent());
        if (req.getPriority() != null) rule.setPriority(req.getPriority());
        return ResponseEntity.ok(ApiResponse.ok("Tax rule updated", repo.save(rule)));
    }

    @PutMapping("/{id}/active")
    public ResponseEntity<ApiResponse<Void>> toggleActive(
            @PathVariable UUID id, @RequestParam boolean active,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId,
            @RequestHeader("X-User-Id") String uid) {
        TaxRule rule = repo.findById(id).orElse(null);
        if (rule == null) return ResponseEntity.notFound().build();
        if (!canManage(rule.getShopId(), role, callerShopId, uid))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        rule.setActive(active);
        repo.save(rule);
        return ResponseEntity.ok(ApiResponse.ok("Updated", null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId,
            @RequestHeader("X-User-Id") String uid) {
        TaxRule rule = repo.findById(id).orElse(null);
        if (rule == null) return ResponseEntity.notFound().build();
        if (!canManage(rule.getShopId(), role, callerShopId, uid))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        repo.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok("Deleted", null));
    }

    // ADMIN always; SUPPORT read-only; otherwise the shop's owner or a manager scoped to it
    private boolean canView(String shopId, String role, String callerShopId, String uid) {
        if ("ADMIN".equals(role) || "SUPPORT".equals(role)) return true;
        return canManage(shopId, role, callerShopId, uid);
    }

    private boolean canManage(String shopId, String role, String callerShopId, String uid) {
        if ("ADMIN".equals(role)) return true;
        if ("MANAGER".equals(role) && shopId.equals(callerShopId)) return true;
        UUID id = safeUuid(shopId);
        if (id == null) return false;
        Shop shop = shopService.findRaw(id).orElse(null);
        return shop != null && shop.getOwnerId().equals(uid);
    }

    private UUID safeUuid(String s) {
        try { return UUID.fromString(s); } catch (Exception e) { return null; }
    }
}
