package in.aviqr.shop.controller;
import in.aviqr.shop.dto.ApiResponse;
import in.aviqr.shop.dto.NearbyShopResponse;
import in.aviqr.shop.service.ShopService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

// Deliberately its own top-level path (not nested under /api/v1/shops/**) —
// that general path is gateway-routed with AuthenticationFilter, and this is
// the public "shops near me" discovery surface for the customer app's
// direct-login landing (as opposed to the QR-scan flow, which already knows
// its shopId). Mirrors the same reasoning as BrandController's
// /api/v1/brands/public split: same-prefix public/protected routes need
// careful gateway ordering, a separate prefix sidesteps that entirely.
@RestController @RequestMapping("/api/v1/nearby-shops") @RequiredArgsConstructor
public class NearbyShopController {
    private final ShopService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<NearbyShopResponse>>> nearby(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue="10") double radiusKm,
            @RequestParam(required=false) String sort) {
        return ResponseEntity.ok(ApiResponse.ok(service.nearby(lat, lng, radiusKm, sort)));
    }
}
