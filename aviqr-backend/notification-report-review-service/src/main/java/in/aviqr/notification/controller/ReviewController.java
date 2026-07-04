package in.aviqr.notification.controller;

import in.aviqr.notification.dto.*;
import in.aviqr.notification.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController @RequestMapping("/api/v1/reviews") @RequiredArgsConstructor
public class ReviewController {
    private final ReviewService service;

    private Pageable pageable(int page, int size, String sort) {
        int clampedSize = switch (size) { case 10, 20, 50, 100 -> size; default -> 20; };
        Sort s = (sort != null && !sort.isBlank())
            ? Sort.by(Sort.Order.desc("createdAt"))
            : Sort.by(Sort.Order.desc("createdAt"));
        return PageRequest.of(Math.max(page, 0), clampedSize, s);
    }

    // ── Public reads (no auth — storefront display) ──────────────────────
    @GetMapping("/public/shop/{shopId}")
    public ResponseEntity<ApiResponse<Page<ReviewResponse>>> byShop(
            @PathVariable String shopId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort) {
        return ResponseEntity.ok(ApiResponse.ok(service.byShop(shopId, pageable(page, size, sort))));
    }

    @GetMapping("/public/shop/{shopId}/summary")
    public ResponseEntity<ApiResponse<RatingSummary>> shopSummary(@PathVariable String shopId) {
        return ResponseEntity.ok(ApiResponse.ok(service.shopSummary(shopId)));
    }

    @GetMapping("/public/product/{menuItemId}")
    public ResponseEntity<ApiResponse<Page<ReviewResponse>>> byProduct(
            @PathVariable UUID menuItemId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort) {
        return ResponseEntity.ok(ApiResponse.ok(service.byMenuItem(menuItemId, pageable(page, size, sort))));
    }

    @GetMapping("/public/product/{menuItemId}/summary")
    public ResponseEntity<ApiResponse<RatingSummary>> productSummary(@PathVariable UUID menuItemId) {
        return ResponseEntity.ok(ApiResponse.ok(service.menuItemSummary(menuItemId)));
    }

    // ── Protected (customer must be authenticated via gateway) ───────────
    @PostMapping
    public ResponseEntity<ApiResponse<ReviewResponse>> submit(
            @Valid @RequestBody ReviewRequest req,
            @RequestHeader("X-User-Id") String customerId) {
        return ResponseEntity.ok(ApiResponse.ok("Review submitted", service.submit(customerId, req)));
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<ApiResponse<Page<ReviewResponse>>> byCustomer(
            @PathVariable String customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(service.byCustomer(customerId, pageable(page, size, null))));
    }
}
