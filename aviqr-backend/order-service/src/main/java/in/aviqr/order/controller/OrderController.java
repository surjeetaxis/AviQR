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
import java.util.LinkedHashMap;

@RestController @RequestMapping("/api/v1/orders") @RequiredArgsConstructor
public class OrderController {
    private final OrderService service;

    // Customer places order
    @PostMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<OrderResponse>> create(
            @PathVariable String shopId,
            @Valid @RequestBody CreateOrderRequest req,
            @RequestHeader(value="X-User-Id", required=false) String uid) {
        return ResponseEntity.ok(ApiResponse.ok("Order placed", service.create(shopId, uid, req)));
    }

    private boolean isShopStaff(String role, String shopId, String callerShopId) {
        if ("ADMIN".equals(role) || "SUPPORT".equals(role)) return true;
        if ("CUSTOMER".equals(role)) return false;
        return shopId.equals(callerShopId);
    }

    // Shop owner/staff — live orders (Kanban)
    @GetMapping("/shop/{shopId}/live")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> live(
            @PathVariable String shopId,
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestHeader(value="X-Shop-Id", defaultValue="") String callerShopId) {
        if (!isShopStaff(role, shopId, callerShopId))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(service.getLiveOrders(shopId)));
    }

    @GetMapping("/shop/{shopId}/stats")
    public ResponseEntity<ApiResponse<Map<String,Object>>> shopStats(
            @PathVariable String shopId,
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestHeader(value="X-Shop-Id", defaultValue="") String callerShopId) {
        if (!isShopStaff(role, shopId, callerShopId))
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
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestHeader(value="X-Shop-Id", defaultValue="") String callerShopId) {
        if (!isShopStaff(role, shopId, callerShopId))
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

    // Customer order history
    @GetMapping("/customer/history")
    public ResponseEntity<ApiResponse<Page<OrderResponse>>> customerHistory(
            @RequestHeader("X-User-Id") String uid,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="10") int size) {
        return ResponseEntity.ok(ApiResponse.ok(service.getCustomerOrders(uid, page, size)));
    }

    // Get single order
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderResponse>> getById(@PathVariable UUID id) {
        return service.getById(id)
            .map(o -> ResponseEntity.ok(ApiResponse.ok(o)))
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