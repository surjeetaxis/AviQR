// ── FILE: order-service/src/main/java/in/aviqr/order/controller/AggregatorWebhookController.java ──
package in.aviqr.order.controller;

import in.aviqr.order.dto.ApiResponse;
import in.aviqr.order.entity.*;
import in.aviqr.order.repository.AggregatorShopMappingRepository;
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
 *    https://api.aviqr.com/api/v1/aggregator/zomato/webhook
 *  Swiggy Restaurant Hub  → Settings → Order Push URL:
 *    https://api.aviqr.com/api/v1/aggregator/swiggy/webhook
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
    private final AggregatorShopMappingRepository mappingRepo;
    private final com.fasterxml.jackson.databind.ObjectMapper json;
    private final in.aviqr.order.config.OrderScopeSecurity scope;

    // Only these roles may change which Zomato/Swiggy restaurant feeds a shop.
    private static final Set<String> MAPPING_WRITE_ROLES = Set.of("OWNER", "MANAGER", "ADMIN", "SUPPORT");

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
            @RequestBody String body,
            @RequestHeader(value = "X-Zomato-Signature", required = false) String signature) {

        // Fail closed: with no secret configured there is no way to tell a real
        // Zomato push from a forged one, so nothing is accepted.
        if (zomatoSecret.isBlank()) {
            log.error("Zomato webhook rejected: aggregator.zomato.secret is not configured");
            return ResponseEntity.status(503).body("Webhook not configured");
        }
        // The HMAC covers the exact bytes Zomato sent, so verify before parsing.
        if (!verifyZomatoSignature(body, signature)) {
            log.warn("Zomato webhook signature verification FAILED");
            return ResponseEntity.status(401).body("Invalid signature");
        }
        return ingest("Zomato", "ZOM-", body, this::mapZomatoOrder);
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
            @RequestBody String body,
            @RequestHeader(value = "X-Swiggy-Token", required = false) String token) {

        if (swiggyToken.isBlank()) {
            log.error("Swiggy webhook rejected: aggregator.swiggy.token is not configured");
            return ResponseEntity.status(503).body("Webhook not configured");
        }
        if (!constantTimeEquals(swiggyToken, token)) {
            log.warn("Swiggy webhook token verification FAILED");
            return ResponseEntity.status(401).body("Invalid token");
        }
        return ingest("Swiggy", "SWG-", body, this::mapSwiggyOrder);
    }

    /** Shared tail of both webhooks, run only after the caller is authenticated. */
    private ResponseEntity<String> ingest(String platform, String prefix, String body,
                                          java.util.function.Function<Map<String, Object>, Order> mapper) {
        Map<String, Object> payload;
        try {
            payload = json.readValue(body, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return ResponseEntity.status(400).body("Invalid JSON");
        }
        if (payload == null || payload.get("order_id") == null) {
            log.warn("{} webhook missing order_id", platform);
            return ResponseEntity.status(400).body("Missing order_id");
        }
        log.info("{} webhook received: orderId={}", platform, payload.get("order_id"));
        // Platforms retry deliveries; a replayed push must not create a second order.
        if (orderRepo.findByOrderNumber(prefix + str(payload, "order_id")).isPresent()) {
            log.info("{} webhook duplicate for orderId={} — ignored", platform, payload.get("order_id"));
            return ResponseEntity.ok("Duplicate");
        }
        try {
            Order order = mapper.apply(payload);
            orderRepo.save(order);
            log.info("{} order mapped: {} → AviQR {}", platform, payload.get("order_id"), order.getOrderNumber());
            return ResponseEntity.ok("OK");
        } catch (UnmappedRestaurantException e) {
            log.warn("{} webhook for unmapped restaurant {} — rejected", platform, e.getMessage());
            return ResponseEntity.status(404).body("Unknown restaurant");
        } catch (Exception e) {
            log.error("{} webhook processing failed", platform, e);
            return ResponseEntity.status(400).body("Processing error");
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
    public ResponseEntity<ApiResponse<AggregatorShopMapping>> saveMapping(
            @RequestBody Map<String, Object> req, jakarta.servlet.http.HttpServletRequest http) {
        String shopId    = str(req, "shopId");
        String platform  = str(req, "platform");
        String aggShopId = str(req, "aggregatorShopId");
        // shopId comes from the body, so OrderScopeSecurity's path check never sees it.
        if (shopId == null || !MAPPING_WRITE_ROLES.contains(Optional.ofNullable(http.getHeader("X-User-Role")).orElse(""))
                || !scope.staff(shopId, http))
            return ResponseEntity.status(403).body(ApiResponse.error("Shop access denied"));
        // One restaurant ID may feed only one shop, or its orders would go to whoever linked it last.
        var taken = mappingRepo.findByPlatformAndAggregatorShopId(platform, aggShopId);
        if (taken.isPresent() && !shopId.equals(taken.get().getShopId()))
            return ResponseEntity.status(409).body(ApiResponse.error("This restaurant ID is already linked to another shop"));
        AggregatorShopMapping mapping = mappingRepo.findByShopIdAndPlatform(shopId, platform)
            .orElseGet(AggregatorShopMapping::new);
        mapping.setShopId(shopId);
        mapping.setPlatform(platform);
        mapping.setAggregatorShopId(aggShopId);
        AggregatorShopMapping saved = mappingRepo.save(mapping);
        log.info("Aggregator mapping registered: platform={} aggId={} → shopId={}", platform, aggShopId, shopId);
        return ResponseEntity.ok(ApiResponse.ok("Mapping saved", saved));
    }

    /**
     * Owner's current Zomato/Swiggy mapping(s) for their shop, shown in Settings.
     *
     * GET /api/v1/aggregator/mapping/{shopId}
     */
    @GetMapping("/mapping/{shopId}")
    public ResponseEntity<ApiResponse<List<AggregatorShopMapping>>> getMapping(@PathVariable String shopId,
            jakarta.servlet.http.HttpServletRequest http) {
        if (!scope.staff(shopId, http))
            return ResponseEntity.status(403).body(ApiResponse.error("Shop access denied"));
        return ResponseEntity.ok(ApiResponse.ok(mappingRepo.findByShopId(shopId)));
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
        // Accept both nested customer object and top-level customer_name/customer_phone
        Map<String, Object> customer = s.containsKey("customer")
            ? (Map<String, Object>) s.get("customer") : Map.of();
        String custName  = customer.isEmpty() ? str(s, "customer_name")  : str(customer, "name");
        String custPhone = customer.isEmpty() ? str(s, "customer_phone") : str(customer, "phone");
        String shopId = resolveShopId("SWIGGY", str(s, "outlet_id"));

        List<OrderItem> items = buildItems(rawItems, "name", "price");
        BigDecimal subtotal = items.stream().map(OrderItem::getTotalPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal tax      = subtotal.multiply(BigDecimal.valueOf(0.05));
        // Accept both bill_total (test payload) and total_price (Swiggy production format)
        String totalStr = str(s, "bill_total") != null ? str(s, "bill_total") : str(s, "total_price");
        BigDecimal total = totalStr != null ? new BigDecimal(totalStr) : subtotal.add(tax);

        Order order = Order.builder()
            .orderNumber("SWG-" + aggOrderId)
            .shopId(shopId)
            .customerName(custName)
            .customerPhone(custPhone)
            .type(OrderType.DELIVERY)
            .paymentMethod(PaymentMethod.ONLINE)
            .paymentStatus(PaymentStatus.CAPTURED)
            .subtotal(subtotal)
            .tax(tax)
            .totalAmount(total)
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

    /** Resolve aggregator's restaurant ID → AviQR shopId from mapping table. An unmapped
     *  ID is rejected rather than used as a shopId, so a push can never land in a shop
     *  that has not linked that restaurant. */
    private String resolveShopId(String platform, String aggShopId) {
        return mappingRepo.findByPlatformAndAggregatorShopId(platform, aggShopId)
            .map(AggregatorShopMapping::getShopId)
            .orElseThrow(() -> new UnmappedRestaurantException(aggShopId));
    }

    private static class UnmappedRestaurantException extends RuntimeException {
        UnmappedRestaurantException(String aggShopId) { super(aggShopId); }
    }

    private boolean verifyZomatoSignature(String payload, String signature) {
        if (signature == null || payload == null) return false;
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec(
                zomatoSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(payload.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return constantTimeEquals(HexFormat.of().formatHex(hash), signature.trim().toLowerCase());
        } catch (Exception e) { return false; }
    }

    private static boolean constantTimeEquals(String expected, String supplied) {
        if (expected == null || supplied == null) return false;
        return java.security.MessageDigest.isEqual(
            expected.getBytes(java.nio.charset.StandardCharsets.UTF_8),
            supplied.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    private String str(Map<String, Object> m, String k) {
        Object v = m.get(k); return v != null ? v.toString() : null;
    }
}
