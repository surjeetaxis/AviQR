package in.aviqr.shop.controller;

import in.aviqr.shop.dto.*;
import in.aviqr.shop.entity.PromotionDiscountType;
import in.aviqr.shop.entity.Shop;
import in.aviqr.shop.entity.ShopPromotion;
import in.aviqr.shop.repository.ShopPromotionRepository;
import in.aviqr.shop.service.ShopService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController @RequestMapping("/api/v1/shop-promotions") @RequiredArgsConstructor
public class ShopPromotionController {
    private final ShopPromotionRepository repo;
    private final ShopService shopService;

    // Public — active, in-window promotions for a shop (customer-facing / poster auto-fill).
    // outletType/category/state/city are optional filters: a promotion scoped to one of
    // them only shows up when the request matches (unscoped promotions always show).
    @GetMapping("/public/{shopId}")
    public ResponseEntity<ApiResponse<List<ShopPromotion>>> publicActive(
            @PathVariable String shopId,
            @RequestParam(required = false) String outletType,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String city) {
        LocalDateTime now = LocalDateTime.now();
        List<ShopPromotion> live = repo.findByShopIdAndActiveTrue(shopId).stream()
            .filter(p -> (p.getStartsAt() == null || !p.getStartsAt().isAfter(now))
                      && (p.getEndsAt() == null || !p.getEndsAt().isBefore(now)))
            .filter(p -> matchesOrUnscoped(p.getOutletType(), outletType)
                      && matchesOrUnscoped(p.getCategory(), category)
                      && matchesOrUnscoped(p.getState(), state)
                      && matchesOrUnscoped(p.getCity(), city))
            .toList();
        return ResponseEntity.ok(ApiResponse.ok(live));
    }

    private boolean matchesOrUnscoped(String promotionValue, String requestValue) {
        return promotionValue == null || (requestValue != null && promotionValue.equalsIgnoreCase(requestValue));
    }

    // Owner/manager (own shop) or ADMIN/SUPPORT — every promotion for a shop, incl. inactive
    @GetMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<List<ShopPromotion>>> listByShop(
            @PathVariable String shopId,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId,
            @RequestHeader("X-User-Id") String uid) {
        if (!canView(shopId, role, callerShopId, uid))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(repo.findByShopId(shopId, Sort.by("createdAt").descending())));
    }

    @PostMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<ShopPromotion>> create(
            @PathVariable String shopId,
            @Valid @RequestBody ShopPromotionRequest req,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId,
            @RequestHeader("X-User-Id") String uid) {
        if (!canManage(shopId, role, callerShopId, uid))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        ShopPromotion promo = ShopPromotion.builder()
            .shopId(shopId)
            .code(req.getCode())
            .label(req.getLabel())
            .discountType(req.getDiscountType() != null ? req.getDiscountType() : PromotionDiscountType.FIXED)
            .discountValue(req.getDiscountValue())
            .outletType(req.getOutletType())
            .category(req.getCategory())
            .state(req.getState())
            .city(req.getCity())
            .startsAt(req.getStartsAt())
            .endsAt(req.getEndsAt())
            .active(true)
            .build();
        return ResponseEntity.ok(ApiResponse.ok("Promotion created", repo.save(promo)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ShopPromotion>> update(
            @PathVariable UUID id,
            @Valid @RequestBody ShopPromotionRequest req,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId,
            @RequestHeader("X-User-Id") String uid) {
        ShopPromotion promo = repo.findById(id).orElse(null);
        if (promo == null) return ResponseEntity.notFound().build();
        if (!canManage(promo.getShopId(), role, callerShopId, uid))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        promo.setCode(req.getCode());
        promo.setLabel(req.getLabel());
        if (req.getDiscountType() != null) promo.setDiscountType(req.getDiscountType());
        promo.setDiscountValue(req.getDiscountValue());
        promo.setOutletType(req.getOutletType());
        promo.setCategory(req.getCategory());
        promo.setState(req.getState());
        promo.setCity(req.getCity());
        promo.setStartsAt(req.getStartsAt());
        promo.setEndsAt(req.getEndsAt());
        return ResponseEntity.ok(ApiResponse.ok("Promotion updated", repo.save(promo)));
    }

    @PutMapping("/{id}/active")
    public ResponseEntity<ApiResponse<Void>> toggleActive(
            @PathVariable UUID id, @RequestParam boolean active,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId,
            @RequestHeader("X-User-Id") String uid) {
        ShopPromotion promo = repo.findById(id).orElse(null);
        if (promo == null) return ResponseEntity.notFound().build();
        if (!canManage(promo.getShopId(), role, callerShopId, uid))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        promo.setActive(active);
        repo.save(promo);
        return ResponseEntity.ok(ApiResponse.ok("Updated", null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId,
            @RequestHeader("X-User-Id") String uid) {
        ShopPromotion promo = repo.findById(id).orElse(null);
        if (promo == null) return ResponseEntity.notFound().build();
        if (!canManage(promo.getShopId(), role, callerShopId, uid))
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
