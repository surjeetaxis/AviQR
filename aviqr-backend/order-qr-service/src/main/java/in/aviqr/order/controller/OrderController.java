package in.aviqr.order.controller;
import in.aviqr.order.dto.*;
import in.aviqr.order.entity.OrderStatus;
import in.aviqr.order.service.OrderService;
import in.aviqr.order.service.QrService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.LinkedHashMap;

@RestController @RequestMapping("/api/v1/orders") @RequiredArgsConstructor
public class OrderController {
    private final OrderService service;
    private final QrService qrService;

    @Value("${internal.sync.secret:}")
    private String internalSyncSecret;

    private static final Set<String> PAYMENT_CONFIRM_ROLES = Set.of("CASHIER", "MANAGER", "OWNER");
    private static final Set<String> PICKUP_CONFIRM_ROLES  = Set.of("CASHIER", "MANAGER", "OWNER", "KITCHEN");

    // ── Anonymous "track my order" — no auth, gateway-routed as /api/v1/orders/public/**
    // (route ordering matters: this must be registered ahead of the general
    // /api/v1/orders/** AuthenticationFilter route — see api-gateway config). Requires
    // BOTH orderNumber and the exact checkout phone number to match; generic 404
    // either way so this can't be used to probe whether an order number exists.
    @GetMapping("/public/lookup")
    public ResponseEntity<ApiResponse<OrderResponse>> lookupPublic(
            @RequestParam String orderNumber,
            @RequestParam String phone) {
        return service.lookupPublic(orderNumber, phone)
            .map(o -> ResponseEntity.ok(ApiResponse.ok(o)))
            .orElse(ResponseEntity.notFound().build());
    }

    // Customer places order
    @PostMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<OrderResponse>> create(
            @PathVariable String shopId,
            @Valid @RequestBody CreateOrderRequest req,
            @RequestHeader(value="X-User-Id", required=false) String uid) {
        return ResponseEntity.ok(ApiResponse.ok("Order placed", service.create(shopId, uid, req, true)));
    }

    // POS bill creation (staff-side shorthand — delegates to the same logic).
    // selfService=false: the cashier is present and collects payment in the same
    // motion as creating the order, so this skips the pay-at-counter code gate.
    @PostMapping("/shop/{shopId}/pos")
    public ResponseEntity<ApiResponse<OrderResponse>> posCreate(
            @PathVariable String shopId,
            @Valid @RequestBody CreateOrderRequest req,
            @RequestHeader(value="X-User-Id", required=false) String uid) {
        return ResponseEntity.ok(ApiResponse.ok("POS order placed", service.create(shopId, uid, req, false)));
    }

    // Suppliers (and any multi-outlet owner) have no single shopId in their JWT —
    // X-Shop-Id is empty for them — so a real ownership check against shop-mall-service
    // is the fallback once the plain single-shop equality check fails.
    private boolean isShopStaff(String role, String shopId, String callerShopId, String uid) {
        if ("ADMIN".equals(role) || "SUPPORT".equals(role)) return true;
        if ("CUSTOMER".equals(role)) return false;
        if (shopId.equals(callerShopId)) return true;
        return service.isShopOwnedBy(shopId, uid);
    }

    // Shop owner/staff — live orders (Kanban)
    @GetMapping("/shop/{shopId}/live")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> live(
            @PathVariable String shopId,
            @RequestHeader(value="X-User-Id", defaultValue="") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestHeader(value="X-Shop-Id", defaultValue="") String callerShopId) {
        if (!isShopStaff(role, shopId, callerShopId, uid))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(service.getLiveOrders(shopId)));
    }

    @GetMapping("/shop/{shopId}/stats")
    public ResponseEntity<ApiResponse<Map<String,Object>>> shopStats(
            @PathVariable String shopId,
            @RequestHeader(value="X-User-Id", defaultValue="") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestHeader(value="X-Shop-Id", defaultValue="") String callerShopId) {
        if (!isShopStaff(role, shopId, callerShopId, uid))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        Map<String,Object> stats = new LinkedHashMap<>();
        stats.put("shopId", shopId);
        stats.put("totalOrders", service.getShopOrders(shopId, null, 0, 1).getTotalElements());
        stats.put("liveOrders", service.getLiveOrders(shopId).size());
        return ResponseEntity.ok(ApiResponse.ok(stats));
    }

    @GetMapping("/item/{itemId}/stats")
    public ResponseEntity<ApiResponse<Map<String,Object>>> itemStats(
            @PathVariable String itemId,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if ("CUSTOMER".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        Map<String,Object> stats = new LinkedHashMap<>();
        stats.put("itemId", itemId);
        stats.put("totalOrders", 0);
        return ResponseEntity.ok(ApiResponse.ok(stats));
    }

    // Shop owner — all orders with pagination
    @GetMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<Page<OrderResponse>>> shopOrders(
            @PathVariable String shopId,
            @RequestParam(required=false) String status,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="20") int size,
            @RequestHeader(value="X-User-Id", defaultValue="") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestHeader(value="X-Shop-Id", defaultValue="") String callerShopId) {
        if (!isShopStaff(role, shopId, callerShopId, uid))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        OrderStatus s = status != null ? OrderStatus.valueOf(status.toUpperCase()) : null;
        return ResponseEntity.ok(ApiResponse.ok(service.getShopOrders(shopId, s, page, size)));
    }

    // Update order status — customer may only cancel their own orders
    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<OrderResponse>> updateStatus(
            @PathVariable UUID id, @RequestParam String status,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if ("CUSTOMER".equals(role) && !"CANCELLED".equalsIgnoreCase(status))
            return ResponseEntity.status(403).body(ApiResponse.error("Customers may only cancel orders"));
        return ResponseEntity.ok(ApiResponse.ok("Status updated", service.updateStatus(id, status, uid)));
    }

    // Counter/kitchen "enter or scan code" screen — read-only preview before acting
    @GetMapping("/shop/{shopId}/lookup-code")
    public ResponseEntity<ApiResponse<OrderResponse>> lookupCode(
            @PathVariable String shopId,
            @RequestParam String code,
            @RequestHeader(value="X-User-Id", defaultValue="") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestHeader(value="X-Shop-Id", defaultValue="") String callerShopId) {
        if (!PICKUP_CONFIRM_ROLES.contains(role) && !"ADMIN".equals(role) && !"SUPPORT".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        if (!isShopStaff(role, shopId, callerShopId, uid))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return service.lookupByCode(shopId, code)
            .map(o -> ResponseEntity.ok(ApiResponse.ok(o)))
            .orElse(ResponseEntity.notFound().build());
    }

    // Cashier/owner confirms a pay-at-counter order (collects payment if still pending,
    // or just acknowledges if already paid) and releases it to the kitchen
    @PostMapping("/shop/{shopId}/confirm-payment")
    public ResponseEntity<ApiResponse<OrderResponse>> confirmPayment(
            @PathVariable String shopId,
            @RequestBody Map<String, String> body,
            @RequestHeader(value="X-User-Id", defaultValue="") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestHeader(value="X-Shop-Id", defaultValue="") String callerShopId) {
        if (!PAYMENT_CONFIRM_ROLES.contains(role) && !"ADMIN".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        if (!isShopStaff(role, shopId, callerShopId, uid))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Payment confirmed", service.confirmPayment(shopId, body.get("code"), uid)));
    }

    // Same code, reused at handover — confirms pickup/delivery once the order is READY
    @PostMapping("/shop/{shopId}/confirm-pickup")
    public ResponseEntity<ApiResponse<OrderResponse>> confirmPickup(
            @PathVariable String shopId,
            @RequestBody Map<String, String> body,
            @RequestHeader(value="X-User-Id", defaultValue="") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestHeader(value="X-Shop-Id", defaultValue="") String callerShopId) {
        if (!PICKUP_CONFIRM_ROLES.contains(role) && !"ADMIN".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        if (!isShopStaff(role, shopId, callerShopId, uid))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Pickup confirmed", service.confirmPickup(shopId, body.get("code"), uid)));
    }

    // Order confirmation code as a scannable QR image — shown on the customer's screen
    @GetMapping(value = "/{id}/code-image", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> codeImage(
            @PathVariable UUID id,
            @RequestHeader(value="X-User-Id", defaultValue="") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) throws Exception {
        var order = service.getById(id).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();
        if ("CUSTOMER".equals(role) && !uid.equals(order.getCustomerId()))
            return ResponseEntity.status(403).build();
        return ResponseEntity.ok()
            .contentType(MediaType.IMAGE_PNG)
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=order-code.png")
            .body(qrService.generateOrderCodeImage(order.getConfirmationCode()));
    }

    // Internal — payment-service notifies us once Razorpay confirms capture, so online
    // orders skip the counter step entirely. Reachable through the public gateway
    // (/api/v1/orders/** is proxied), so it's gated by a shared secret rather than a
    // user JWT — same pattern as AggregatorWebhookController's per-platform secrets.
    @PostMapping("/{id}/payment-sync")
    public ResponseEntity<ApiResponse<String>> paymentSync(
            @PathVariable UUID id,
            @RequestHeader(value="X-Internal-Secret", required=false) String secret) {
        if (!internalSyncSecret.isBlank() && !internalSyncSecret.equals(secret))
            return ResponseEntity.status(401).body(ApiResponse.error("Invalid secret"));
        service.syncPaymentCaptured(id);
        return ResponseEntity.ok(ApiResponse.ok("Synced"));
    }

    // Customer order history
    @GetMapping("/customer/history")
    public ResponseEntity<ApiResponse<Page<OrderResponse>>> customerHistory(
            @RequestHeader("X-User-Id") String uid,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="10") int size) {
        return ResponseEntity.ok(ApiResponse.ok(service.getCustomerOrders(uid, page, size)));
    }

    // Get single order — customers may only view their own
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderResponse>> getById(
            @PathVariable UUID id,
            @RequestHeader(value="X-User-Id", defaultValue="") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        return service.getById(id)
            .map(o -> {
                if ("CUSTOMER".equals(role) && !uid.equals(o.getCustomerId()))
                    return ResponseEntity.status(403).body(ApiResponse.<OrderResponse>error("Forbidden"));
                return ResponseEntity.ok(ApiResponse.ok(o));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // Admin — all orders platform-wide
    @GetMapping("/admin/all")
    public ResponseEntity<ApiResponse<Page<OrderResponse>>> adminAll(
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="30") int size) {
        if (!"ADMIN".equals(role) && !"SUPPORT".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(service.listAll(page, size)));
    }
}