// ── FILE: shop-service/src/main/java/in/aviqr/shop/controller/LoyaltyController.java ──
package in.aviqr.shop.controller;

import in.aviqr.shop.dto.ApiResponse;
import in.aviqr.shop.service.LoyaltyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

/**
 * MARKET FEATURE: Loyalty / repeat-customer REST API.
 *
 * Endpoints:
 *   GET  /api/v1/loyalty/{shopId}/balance?phone=98XXXXXXXX  → customer balance + can-redeem flag
 *   POST /api/v1/loyalty/{shopId}/earn                      → earn points after order (called by order-service via event)
 *   POST /api/v1/loyalty/{shopId}/redeem                    → redeem points at checkout
 *   GET  /api/v1/loyalty/{shopId}/customers                 → all loyalty customers (owner CRM)
 *   GET  /api/v1/loyalty/{shopId}/history?phone=98XXXXXXXX  → transaction history
 */
@RestController
@RequestMapping("/api/v1/loyalty")
@RequiredArgsConstructor
public class LoyaltyController {

    private final LoyaltyService loyaltyService;

    /** Customer checks their balance before placing order */
    @GetMapping("/{shopId}/balance")
    public ResponseEntity<ApiResponse<Map<String, Object>>> balance(
            @PathVariable String shopId,
            @RequestParam String phone) {
        return ResponseEntity.ok(ApiResponse.ok(loyaltyService.getBalance(shopId, phone)));
    }

    /** Earn points — called after order completion */
    @PostMapping("/{shopId}/earn")
    public ResponseEntity<ApiResponse<Object>> earn(
            @PathVariable String shopId,
            @RequestBody EarnRequest req) {
        var account = loyaltyService.earnPoints(
            shopId, req.phone(), req.customerName(),
            req.orderAmount(), req.orderId());
        if (account == null) return ResponseEntity.ok(ApiResponse.ok("Loyalty not enabled", null));
        return ResponseEntity.ok(ApiResponse.ok("Points earned: " + account.getTotalPoints(), account));
    }

    /** Redeem points at checkout */
    @PostMapping("/{shopId}/redeem")
    public ResponseEntity<ApiResponse<Map<String, Object>>> redeem(
            @PathVariable String shopId,
            @RequestBody RedeemRequest req) {
        BigDecimal discount = loyaltyService.redeemPoints(
            shopId, req.phone(), req.pointsToRedeem(), req.orderId());
        return ResponseEntity.ok(ApiResponse.ok("Discount applied",
            Map.of("discount", discount, "pointsUsed", req.pointsToRedeem())));
    }

    /** Owner sees all loyalty customers — CRM view */
    @GetMapping("/{shopId}/customers")
    public ResponseEntity<ApiResponse<Object>> customers(@PathVariable String shopId) {
        return ResponseEntity.ok(ApiResponse.ok(loyaltyService.getShopLoyaltyAccounts(shopId)));
    }

    /** Transaction history for a specific customer */
    @GetMapping("/{shopId}/history")
    public ResponseEntity<ApiResponse<Object>> history(
            @PathVariable String shopId,
            @RequestParam String phone) {
        return ResponseEntity.ok(ApiResponse.ok(loyaltyService.getHistory(shopId, phone)));
    }

    // ── Request records ───────────────────────────────────────────────────────
    record EarnRequest(String phone, String customerName, BigDecimal orderAmount, String orderId) {}
    record RedeemRequest(String phone, int pointsToRedeem, String orderId) {}
}
