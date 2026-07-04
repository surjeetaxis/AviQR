// ── FILE: menu-service/src/main/java/in/aviqr/menu/controller/InventoryController.java ──
package in.aviqr.menu.controller;

import in.aviqr.menu.dto.ApiResponse;
import in.aviqr.menu.entity.StockItem;
import in.aviqr.menu.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST API for inventory management.
 *
 * Endpoints:
 *   GET  /api/v1/inventory/shop/{shopId}          → all stock levels for shop
 *   GET  /api/v1/inventory/shop/{shopId}/summary  → out-of-stock + low-stock counts
 *   PUT  /api/v1/inventory/item/{itemId}           → set/update stock for one item
 *   GET  /api/v1/inventory/shop/{shopId}/out-of-stock
 *   GET  /api/v1/inventory/shop/{shopId}/low-stock
 */
@RestController
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;
    private final in.aviqr.menu.repository.MenuItemRepository menuItemRepo;

    /** Get all stock levels for a shop */
    @GetMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<List<StockItem>>> getShopStock(
            @PathVariable String shopId,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if ("CUSTOMER".equals(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        if (!"ADMIN".equals(role) && !"SUPPORT".equals(role) && !shopId.equals(callerShopId))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getShopStock(shopId)));
    }

    /** Dashboard summary: total tracked, out-of-stock count, low-stock count */
    @GetMapping("/shop/{shopId}/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSummary(@PathVariable String shopId) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getStockSummary(shopId)));
    }

    /** Set or update stock for a single item */
    @PutMapping("/item/{itemId}")
    public ResponseEntity<ApiResponse<StockItem>> setStock(
            @PathVariable UUID itemId,
            @RequestBody StockUpdateRequest req,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if ("CUSTOMER".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        // resolve shopId from menu item if not supplied in request body
        String shopId = req.getShopId();
        if (shopId == null || shopId.isBlank()) {
            shopId = menuItemRepo.findById(itemId)
                .map(in.aviqr.menu.entity.MenuItem::getShopId)
                .orElse(null);
        }
        if (shopId == null) return ResponseEntity.status(404).body(ApiResponse.error("Menu item not found"));
        StockItem saved = inventoryService.setStock(
            itemId, shopId, req.getStockQty(), req.getLowStockThreshold(), req.getTrackStock());
        return ResponseEntity.ok(ApiResponse.ok("Stock updated", saved));
    }

    /** Items with 0 stock */
    @GetMapping("/shop/{shopId}/out-of-stock")
    public ResponseEntity<ApiResponse<List<StockItem>>> outOfStock(@PathVariable String shopId) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getOutOfStock(shopId)));
    }

    /** Items below low-stock threshold */
    @GetMapping("/shop/{shopId}/low-stock")
    public ResponseEntity<ApiResponse<List<StockItem>>> lowStock(@PathVariable String shopId) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.getLowStock(shopId)));
    }

    // ── Inner DTO ────────────────────────────────────────────────────────────
    @lombok.Data
    public static class StockUpdateRequest {
        private String  shopId;
        private Integer stockQty;
        private Integer lowStockThreshold;
        private Boolean trackStock;
    }
}
