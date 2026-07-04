package in.aviqr.menu.controller;

import in.aviqr.menu.dto.ApiResponse;
import in.aviqr.menu.entity.*;
import in.aviqr.menu.service.RecipeService;
import in.aviqr.menu.service.VariantAddonService;
import in.aviqr.menu.repository.MenuItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class RecipeVariantController {

    private final VariantAddonService variantAddonSvc;
    private final RecipeService       recipeSvc;
    private final MenuItemRepository  menuItemRepo;

    private boolean isStaff(String role) {
        return !"CUSTOMER".equals(role) && !role.isBlank();
    }

    private boolean canAccessShop(String role, String shopId, String callerShopId) {
        if ("CUSTOMER".equals(role) || role.isBlank()) return false;
        if ("ADMIN".equals(role) || "SUPPORT".equals(role)) return true;
        return shopId.equals(callerShopId);
    }

    // ── Variants ──────────────────────────────────────────────────────────────

    @GetMapping("/items/{itemId}/variants")
    public ResponseEntity<ApiResponse<List<MenuVariant>>> getVariants(
            @PathVariable UUID itemId,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        return ResponseEntity.ok(ApiResponse.ok(variantAddonSvc.getVariants(itemId)));
    }

    @PutMapping("/items/{itemId}/variants")
    public ResponseEntity<ApiResponse<List<MenuVariant>>> saveVariants(
            @PathVariable UUID itemId,
            @RequestBody List<MenuVariant> variants,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!isStaff(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(variantAddonSvc.saveVariants(itemId, variants)));
    }

    @DeleteMapping("/items/{itemId}/variants")
    public ResponseEntity<ApiResponse<Void>> deleteVariants(
            @PathVariable UUID itemId,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!isStaff(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        variantAddonSvc.deleteVariants(itemId);
        return ResponseEntity.ok(ApiResponse.<Void>ok(null));
    }

    // ── Add-ons ───────────────────────────────────────────────────────────────

    @GetMapping("/addons/shop/{shopId}")
    public ResponseEntity<ApiResponse<List<MenuAddon>>> getAddons(
            @PathVariable String shopId,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canAccessShop(role, shopId, callerShopId))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(variantAddonSvc.getAddons(shopId)));
    }

    @PostMapping("/addons")
    public ResponseEntity<ApiResponse<MenuAddon>> createAddon(
            @RequestBody MenuAddon addon,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(variantAddonSvc.createAddon(addon)));
    }

    @PutMapping("/addons/{id}")
    public ResponseEntity<ApiResponse<MenuAddon>> updateAddon(
            @PathVariable UUID id, @RequestBody MenuAddon addon,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(variantAddonSvc.updateAddon(id, addon)));
    }

    @DeleteMapping("/addons/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAddon(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        variantAddonSvc.deleteAddon(id);
        return ResponseEntity.ok(ApiResponse.<Void>ok(null));
    }

    // ── Raw Materials ─────────────────────────────────────────────────────────

    @GetMapping("/raw-materials/shop/{shopId}")
    public ResponseEntity<ApiResponse<List<RawMaterial>>> getMaterials(
            @PathVariable String shopId,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canAccessShop(role, shopId, callerShopId))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(recipeSvc.getMaterials(shopId)));
    }

    @GetMapping("/raw-materials/shop/{shopId}/low-stock")
    public ResponseEntity<ApiResponse<List<RawMaterial>>> getLowStock(
            @PathVariable String shopId,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canAccessShop(role, shopId, callerShopId))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(recipeSvc.getLowStockMaterials(shopId)));
    }

    @PostMapping("/raw-materials")
    public ResponseEntity<ApiResponse<RawMaterial>> createMaterial(
            @RequestBody RawMaterial m,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(recipeSvc.createMaterial(m)));
    }

    @PutMapping("/raw-materials/{id}")
    public ResponseEntity<ApiResponse<RawMaterial>> updateMaterial(
            @PathVariable UUID id, @RequestBody RawMaterial m,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(recipeSvc.updateMaterial(id, m)));
    }

    @DeleteMapping("/raw-materials/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMaterial(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        recipeSvc.deleteMaterial(id);
        return ResponseEntity.ok(ApiResponse.<Void>ok(null));
    }

    @PostMapping("/raw-materials/{id}/adjust")
    public ResponseEntity<ApiResponse<Void>> adjustStock(
            @PathVariable UUID id,
            @RequestParam BigDecimal delta,
            @RequestParam(required=false) String reason,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        recipeSvc.adjustStock(id, delta, reason);
        return ResponseEntity.ok(ApiResponse.<Void>ok(null));
    }

    // ── Recipe ────────────────────────────────────────────────────────────────

    @GetMapping("/items/{itemId}/recipe")
    public ResponseEntity<ApiResponse<List<RecipeItem>>> getRecipe(
            @PathVariable UUID itemId,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(recipeSvc.getRecipe(itemId)));
    }

    @PutMapping("/items/{itemId}/recipe")
    public ResponseEntity<ApiResponse<List<RecipeItem>>> saveRecipe(
            @PathVariable UUID itemId, @RequestBody List<RecipeItem> items,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(recipeSvc.saveRecipe(itemId, items)));
    }

    @GetMapping("/items/{itemId}/cost")
    public ResponseEntity<ApiResponse<Map<String,Object>>> getDishCost(
            @PathVariable UUID itemId,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        BigDecimal cost = recipeSvc.calculateDishCost(itemId);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("ingredientCost", cost)));
    }
}
