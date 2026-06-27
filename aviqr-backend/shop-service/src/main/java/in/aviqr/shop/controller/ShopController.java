package in.aviqr.shop.controller;
import in.aviqr.shop.dto.*;
import in.aviqr.shop.entity.ShopStatus;
import in.aviqr.shop.service.ShopService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController @RequestMapping("/api/v1/shops") @RequiredArgsConstructor
public class ShopController {
    private final ShopService service;

    @PostMapping
    public ResponseEntity<ApiResponse<ShopResponse>> create(
            @Valid @RequestBody ShopRequest req,
            @RequestHeader("X-User-Id") String uid) {
        return ResponseEntity.ok(ApiResponse.ok("Shop created", service.create(uid, req)));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<ShopResponse>>> my(@RequestHeader("X-User-Id") String uid) {
        return ResponseEntity.ok(ApiResponse.ok(service.getMyShops(uid)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ShopResponse>> getById(@PathVariable UUID id) {
        return service.getById(id)
            .map(s -> ResponseEntity.ok(ApiResponse.ok(s)))
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ShopResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody ShopRequest req,
            @RequestHeader("X-User-Id") String uid) {
        return ResponseEntity.ok(ApiResponse.ok("Updated", service.update(id, uid, req)));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> status(@PathVariable UUID id, @RequestParam String status) {
        service.updateStatus(id, ShopStatus.valueOf(status.toUpperCase()));
        return ResponseEntity.ok(ApiResponse.ok("Status updated", null));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ShopResponse>>> list(
            @RequestParam(required=false) String search,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="20") int size) {
        Page<ShopResponse> result = search!=null ? service.search(search,page,size) : service.listAll(page,size);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}