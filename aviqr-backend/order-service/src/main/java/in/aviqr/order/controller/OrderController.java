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
    public ResponseEntity<ApiResponse<List<OrderResponse>>> live(@PathVariable String shopId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getLiveOrders(shopId)));
    }

    // Shop owner — all orders with pagination
    @GetMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<Page<OrderResponse>>> shopOrders(
            @PathVariable String shopId,
            @RequestParam(required=false) String status,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="20") int size) {
        OrderStatus s = status != null ? OrderStatus.valueOf(status.toUpperCase()) : null;
        return ResponseEntity.ok(ApiResponse.ok(service.getShopOrders(shopId, s, page, size)));
    }

    // Update order status
    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<OrderResponse>> updateStatus(
            @PathVariable UUID id, @RequestParam String status,
            @RequestHeader("X-User-Id") String uid) {
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
}