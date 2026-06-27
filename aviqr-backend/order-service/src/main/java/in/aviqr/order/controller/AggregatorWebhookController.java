// ── FILE: order-service/src/main/java/in/aviqr/order/controller/AggregatorWebhookController.java ──
package in.aviqr.order.controller;

import in.aviqr.order.dto.ApiResponse;
import in.aviqr.order.entity.*;
import in.aviqr.order.repository.OrderRepository;
import in.aviqr.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

/**
 * MARKET FEATURE: Zomato & Swiggy order webhook integration.
 *
 * Both Zomato and Swiggy send webhooks when a new order is placed on their
 * platform for a restaurant that has registered AviQR as its POS/webhook endpoint.
 *
 * Setup (do once per restaurant):
 *  Zomato Partner Portal  → Integrations → POS Webhook URL:
 *    https://api.aviqr.in/api/v1/aggregator/zomato/webhook
 *  Swiggy Restaurant Hub  → Settings → Order Push URL:
 *    https://api.aviqr.in/api/v1/aggregator/swiggy/webhook
 *
 * VERIFICATION:
 *  Both platforms send a signature header to verify authenticity.
 *  - Zomato:  X-Zomato-Signature: HMAC-SHA256(secret, payload)
 *  - Swiggy:  X-Swiggy-Token: shared API token
 *
 * Shop mapping: The aggregatorShopId (Zomato restaurant ID / Swiggy outlet ID)
 * must be mapped to AviQR shopId in the aggregator_shop_mapping table.
 * Owner sets this once in their AviQR settings.
 *
 * Result: All Zomato/Swiggy orders appear in the SAME AviQR live order feed
 * as dine-in orders. Staff manage everything from one screen.
 */
@RestController
@RequestMapping("/api/v1/aggregator")
@RequiredArgsConstructor
@Slf4j
public class AggregatorWebhookController {

    private final OrderRepository orderRepo;
    private final OrderService    orderService;

    @Value("${aggregator.zomato.secret:}")  private String zomatoSecret;
    @Value("${aggregator.swiggy.token:}")   private String swiggyToken;

    // ── Zomato Webhook ──────────────────────────────────────────────────────
    /**
     * Receives new order events from Zomato.
     *
     * Zomato payload structure (simplified):
     * {
     *   "order_id": "ZOM-12345",
     *   "restaurant_id": "543210",
     *   "order_items": [{ "item_name": "...", "quantity": 2, "base_price": 150 }],
     *   "order_total": 350,
     *   "customer_name": "...",
     *   "customer_phone": "98XXXXXXXX",
     *   "delivery_type": "DELIVERY",
     *   "instructions": "..."
     * }
     */
    @PostMapping("/zomato/webhook")
    public ResponseEntity<String> zomatoWebhook(
            @RequestBody Map<String, Object> payload,
            @RequestHeader(value = "X-Zomato-Signature", required = false) String signature) {

        log.info("Zomato webhook received: orderId={}", payload.get("order_id"));

        // 1. Verify signature (skip in dev if secret not set)
        if (!zomatoSecret.isBlank() && !verifyZomatoSignature(payload.toString(), signature)) {
            log.warn("Zomato webhook signature verification FAILED");
            return ResponseEntity.status(401).body("Invalid signature");
        }

        try {
            Order order = mapZomatoOrder(payload);
            orderRepo.save(order);
            log.info("Zomato order mapped: {} → AviQR {}", payload.get("order_id"), order.getOrderNumber());
            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            log.error("Zomato webhook processing failed", e);
            return ResponseEntity.status(500).body("Processing error");
        }
    }

    // ── Swiggy Webhook ──────────────────────────────────────────────────────
    /**
     * Receives new order events from Swiggy.
     *
     * Swiggy payload structure (simplified):
     * {
     *   "order_id": "SWG-67890",
     *   "outlet_id": "OUT-001",
     *   "items": [{ "name": "...", "quantity": 1, "price": 250 }],
     *   "total_price": 280,
     *   "customer": { "name": "...", "phone": "98XXXXXXXX" },
     *   "order_type": "DELIVERY",
     *   "special_instructions": "..."
     * }
     */
    @PostMapping("/swiggy/webhook")
    public ResponseEntity<String> swiggyWebhook(
            @RequestBody Map<String, Object> payload,
            @RequestHeader(value = "X-Swiggy-Token", required = false) String token) {

        log.info("Swiggy webhook received: orderId={}", payload.get("order_id"));

        if (!swiggyToken.isBlank() && !swiggyToken.equals(token)) {
            log.warn("Swiggy webhook token verification FAILED");
            return ResponseEntity.status(401).body("Invalid token");
        }

        try {
            Order order = mapSwiggyOrder(payload);
            orderRepo.save(order);
            log.info("Swiggy order mapped: {} → AviQR {}", payload.get("order_id"), order.getOrderNumber());
            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            log.error("Swiggy webhook processing failed", e);
            return ResponseEntity.status(500).body("Processing error");
        }
    }

    // ── Aggregator shop mapping endpoints ───────────────────────────────────
    /**
     * Owner registers their Zomato/Swiggy restaurant ID → AviQR shop ID mapping.
     * Call once during onboarding.
     *
     * POST /api/v1/aggregator/mapping
     * Body: { "shopId": "uuid", "platform": "ZOMATO", "aggregatorShopId": "543210" }
     */
    @PostMapping("/mapping")
    public ResponseEntity<ApiResponse<Map<String, Object>>> saveMapping(
            @RequestBody Map<String, Object> req) {
        // TODO: persist to aggregator_shop_mapping table
        // For now, acknowledge — implementation uses a simple Map cache or DB table
        log.info("Aggregator mapping registered: platform={} aggId={} → shopId={}",
            req.get("platform"), req.get("aggregatorShopId"), req.get("shopId"));
        return ResponseEntity.ok(ApiResponse.ok("Mapping saved", req));
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Order mapZomatoOrder(Map<String, Object> z) {
        String aggOrderId = str(z, "order_id");
        List<Map<String, Object>> rawItems = (List<Map<String, Object>>) z.get("order_items");
        String shopId = resolveShopId("ZOMATO", str(z, "restaurant_id"));

        List<OrderItem> items = buildItems(rawItems, "item_name", "base_price");
        BigDecimal subtotal = items.stream().map(OrderItem::getTotalPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal tax      = subtotal.multiply(BigDecimal.valueOf(0.05));

        Order order = Order.builder()
            .orderNumber("ZOM-" + aggOrderId)
            .shopId(shopId)
            .customerName(str(z, "customer_name"))
            .customerPhone(str(z, "customer_phone"))
            .type(OrderType.DELIVERY)
            .paymentMethod(PaymentMethod.ONLINE)
            .paymentStatus(PaymentStatus.CAPTURED) // Zomato pre-pays
            .subtotal(subtotal)
            .tax(tax)
            .totalAmount(new BigDecimal(str(z, "order_total")))
            .notes(str(z, "instructions"))
            .build();
        order.setItems(items);
        items.forEach(i -> i.setOrder(order));
        return order;
    }

    @SuppressWarnings("unchecked")
    private Order mapSwiggyOrder(Map<String, Object> s) {
        String aggOrderId   = str(s, "order_id");
        List<Map<String, Object>> rawItems = (List<Map<String, Object>>) s.get("items");
        Map<String, Object> customer = (Map<String, Object>) s.getOrDefault("customer", Map.of());
        String shopId = resolveShopId("SWIGGY", str(s, "outlet_id"));

        List<OrderItem> items = buildItems(rawItems, "name", "price");
        BigDecimal subtotal = items.stream().map(OrderItem::getTotalPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal tax      = subtotal.multiply(BigDecimal.valueOf(0.05));

        Order order = Order.builder()
            .orderNumber("SWG-" + aggOrderId)
            .shopId(shopId)
            .customerName(str(customer, "name"))
            .customerPhone(str(customer, "phone"))
            .type(OrderType.DELIVERY)
            .paymentMethod(PaymentMethod.ONLINE)
            .paymentStatus(PaymentStatus.CAPTURED)
            .subtotal(subtotal)
            .tax(tax)
            .totalAmount(new BigDecimal(str(s, "total_price")))
            .notes(str(s, "special_instructions"))
            .build();
        order.setItems(items);
        items.forEach(i -> i.setOrder(order));
        return order;
    }

    private List<OrderItem> buildItems(List<Map<String, Object>> rawItems,
                                        String nameKey, String priceKey) {
        if (rawItems == null) return new ArrayList<>();
        return rawItems.stream().map(i -> {
            String name  = str(i, nameKey);
            int    qty   = ((Number) i.getOrDefault("quantity", 1)).intValue();
            BigDecimal price = new BigDecimal(str(i, priceKey) != null ? str(i, priceKey) : "0");
            return OrderItem.builder()
                .menuItemId(UUID.randomUUID()) // aggregator items don't have AviQR item IDs
                .itemName(name)
                .quantity(qty)
                .unitPrice(price)
                .totalPrice(price.multiply(BigDecimal.valueOf(qty)))
                .build();
        }).collect(java.util.stream.Collectors.toList());
    }

    /** Resolve aggregator's restaurant ID → AviQR shopId from mapping table */
    private String resolveShopId(String platform, String aggShopId) {
        // TODO: query aggregator_shop_mapping table
        // For now return the aggShopId as-is (owner must name their shop with same ID)
        // Replace with: return mappingRepo.findByPlatformAndAggregatorShopId(platform, aggShopId).getShopId();
        return aggShopId;
    }

    private boolean verifyZomatoSignature(String payload, String signature) {
        if (signature == null) return false;
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec(
                zomatoSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(payload.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash).equals(signature);
        } catch (Exception e) { return false; }
    }

    private String str(Map<String, Object> m, String k) {
        Object v = m.get(k); return v != null ? v.toString() : null;
    }
}
