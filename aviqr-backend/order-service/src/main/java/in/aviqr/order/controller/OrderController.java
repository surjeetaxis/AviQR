package in.aviqr.order.controller;
import in.aviqr.order.dto.*;
import in.aviqr.order.entity.OrderStatus;
import in.aviqr.order.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/v1/orders") @RequiredArgsConstructor
public class OrderController {
    private final OrderService service;

    // Roles allowed to manage a shop's orders, provided their X-Shop-Id matches the shop.
    private static final Set<String> SHOP_STAFF_ROLES =
        Set.of("OWNER", "MANAGER", "KITCHEN", "CASHIER", "ORDER_VIEWER");

    private boolean canManageShop(String role, String callerShopId, String resourceShopId) {
        if ("ADMIN".equals(role)) return true;
        return resourceShopId != null && resourceShopId.equals(callerShopId) && SHOP_STAFF_ROLES.contains(role);
    }

    private ResponseEntity<ApiResponse<Void>> forbidden() {
        return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
    }

    // Customer places order
    @PostMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<OrderResponse>> create(
            @PathVariable String shopId,
            @Valid @RequestBody CreateOrderRequest req,
            @RequestHeader(value="X-User-Id", required=false) String uid) {
        return ResponseEntity.ok(ApiResponse.ok("Order placed", service.create(shopId, uid, req)));
    }

    // Shop owner — live orders (Kanban)
    @GetMapping("/shop/{shopId}/live")
    public ResponseEntity<?> live(@PathVariable String shopId,
                                   @RequestHeader("X-User-Role") String role,
                                   @RequestHeader(value="X-Shop-Id", required=false) String callerShopId) {
        if (!canManageShop(role, callerShopId, shopId)) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok(service.getLiveOrders(shopId)));
    }

    // Shop owner — all orders with pagination
    @GetMapping("/shop/{shopId}")
    public ResponseEntity<?> shopOrders(
            @PathVariable String shopId,
            @RequestParam(required=false) String status,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="20") int size,
            @RequestHeader("X-User-Role") String role,
            @RequestHeader(value="X-Shop-Id", required=false) String callerShopId) {
        if (!canManageShop(role, callerShopId, shopId)) return forbidden();
        OrderStatus s = status != null ? OrderStatus.valueOf(status.toUpperCase()) : null;
        return ResponseEntity.ok(ApiResponse.ok(service.getShopOrders(shopId, s, page, size)));
    }

    // Update order status — shop staff for their own shop, or the customer cancelling their own order
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable UUID id, @RequestParam String status,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader("X-User-Role") String role,
            @RequestHeader(value="X-Shop-Id", required=false) String callerShopId) {
        var order = service.getById(id).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();
        boolean isOwnCancellation = "CUSTOMER".equals(role) && uid.equals(order.getCustomerId())
            && "CANCELLED".equalsIgnoreCase(status);
        if (!canManageShop(role, callerShopId, order.getShopId()) && !isOwnCancellation) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok("Status updated", service.updateStatus(id, status, uid)));
    }

    // Customer order history
    @GetMapping("/customer/history")
    public ResponseEntity<ApiResponse<Page<OrderResponse>>> customerHistory(
            @RequestHeader("X-User-Id") String uid,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="10") int size) {
        return ResponseEntity.ok(ApiResponse.ok(service.getCustomerOrders(uid, page, size)));
    }

    // Get single order — shop staff for their own shop, the customer who placed it, or admin
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable UUID id,
                                      @RequestHeader("X-User-Id") String uid,
                                      @RequestHeader("X-User-Role") String role,
                                      @RequestHeader(value="X-Shop-Id", required=false) String callerShopId) {
        var order = service.getById(id).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();
        boolean isOwnOrder = uid.equals(order.getCustomerId());
        if (!canManageShop(role, callerShopId, order.getShopId()) && !isOwnOrder) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok(order));
    }

    // Internal — consumed by shop-service's Seller Tier scheduled job
    @GetMapping("/shop/{shopId}/stats")
    public ResponseEntity<?> shopStats(@PathVariable String shopId,
                                        @RequestHeader("X-User-Role") String role,
                                        @RequestHeader(value="X-Shop-Id", required=false) String callerShopId) {
        if (!canManageShop(role, callerShopId, shopId)) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok(service.getShopStats(shopId)));
    }

    // Internal — consumed by menu-service's Product Ranking scheduled job
    @GetMapping("/item/{menuItemId}/stats")
    public ResponseEntity<?> itemStats(@PathVariable UUID menuItemId,
                                        @RequestHeader("X-User-Role") String role) {
        if ("CUSTOMER".equals(role)) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok(service.getItemStats(menuItemId)));
    }
}