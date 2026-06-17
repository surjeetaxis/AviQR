package in.aviqr.shop.controller;

import in.aviqr.shop.dto.ApiResponse;
import in.aviqr.shop.entity.ShopSettings;
import in.aviqr.shop.repository.ShopSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final ShopSettingsRepository repo;

    @GetMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<ShopSettings>> get(@PathVariable UUID shopId) {
        ShopSettings settings = repo.findById(shopId).orElseGet(() -> {
            ShopSettings s = new ShopSettings();
            s.setShopId(shopId);
            return s;
        });
        return ResponseEntity.ok(ApiResponse.ok(settings));
    }

    @PutMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<ShopSettings>> update(
            @PathVariable UUID shopId,
            @RequestBody ShopSettings req) {
        req.setShopId(shopId);
        return ResponseEntity.ok(ApiResponse.ok("Settings saved", repo.save(req)));
    }
}
