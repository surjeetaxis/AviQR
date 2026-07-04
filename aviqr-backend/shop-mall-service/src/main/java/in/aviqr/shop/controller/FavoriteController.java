package in.aviqr.shop.controller;

import in.aviqr.shop.dto.ApiResponse;
import in.aviqr.shop.entity.CustomerFavorite;
import in.aviqr.shop.entity.Shop;
import in.aviqr.shop.repository.CustomerFavoriteRepository;
import in.aviqr.shop.repository.ShopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Customer Portal: star/unstar a shop by phone — same phone-keyed, no-account-required
 * identity model as LoyaltyController.
 */
@RestController
@RequestMapping("/api/v1/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final CustomerFavoriteRepository favoriteRepo;
    private final ShopRepository shopRepo;

    // Toggle: favorite if not already, un-favorite if it already is.
    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggle(@RequestBody ToggleRequest req) {
        var existing = favoriteRepo.findByCustomerPhoneAndShopId(req.phone(), req.shopId());
        boolean nowFavorited;
        if (existing.isPresent()) {
            favoriteRepo.delete(existing.get());
            nowFavorited = false;
        } else {
            favoriteRepo.save(CustomerFavorite.builder().customerPhone(req.phone()).shopId(req.shopId()).build());
            nowFavorited = true;
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of("favorited", nowFavorited)));
    }

    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> mine(@RequestParam String phone) {
        List<Map<String, Object>> result = favoriteRepo.findByCustomerPhoneOrderByCreatedAtDesc(phone).stream()
            .map(f -> {
                Shop shop = shopRepo.findById(UUID.fromString(f.getShopId())).orElse(null);
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("shopId", f.getShopId());
                m.put("shopName", shop != null ? shop.getName() : "Unknown restaurant");
                m.put("city", shop != null ? shop.getCity() : null);
                m.put("favoritedAt", f.getCreatedAt());
                return m;
            })
            .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    record ToggleRequest(String phone, String shopId) {}
}
