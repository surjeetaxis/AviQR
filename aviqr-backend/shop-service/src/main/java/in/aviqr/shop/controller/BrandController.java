package in.aviqr.shop.controller;
import in.aviqr.shop.dto.*;
import in.aviqr.shop.entity.*;
import in.aviqr.shop.repository.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController @RequestMapping("/api/v1/brands") @RequiredArgsConstructor
public class BrandController {
    private final BrandRepository brandRepo;
    private final ShopRepository shopRepo;

    // Upsert the caller's brand — one per supplier, keyed by ownerId.
    @PostMapping
    public ResponseEntity<ApiResponse<Brand>> upsert(
            @Valid @RequestBody BrandRequest req,
            @RequestHeader("X-User-Id") String uid) {
        Brand brand = brandRepo.findByOwnerId(uid).orElseGet(() -> Brand.builder().ownerId(uid).build());
        brand.setName(req.getName());
        if (req.getLogoUrl() != null) brand.setLogoUrl(req.getLogoUrl());
        if (req.getCity() != null) brand.setCity(req.getCity());
        return ResponseEntity.ok(ApiResponse.ok("Saved", brandRepo.save(brand)));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Brand>> my(@RequestHeader("X-User-Id") String uid) {
        return brandRepo.findByOwnerId(uid)
            .map(b -> ResponseEntity.ok(ApiResponse.ok(b)))
            .orElse(ResponseEntity.notFound().build());
    }

    // Public brand header (Brand QR flow) — gateway permits unauthenticated access
    // under /api/v1/brands/public/**, same pattern as mall-service's public routes.
    @GetMapping("/public/{id}")
    public ResponseEntity<ApiResponse<Brand>> publicBrand(@PathVariable UUID id) {
        return brandRepo.findById(id)
            .map(b -> ResponseEntity.ok(ApiResponse.ok(b)))
            .orElse(ResponseEntity.notFound().build());
    }

    // Public list of the brand's active outlets — what the Brand QR scan lands on.
    @GetMapping("/public/{id}/shops")
    public ResponseEntity<ApiResponse<List<PublicShopResponse>>> publicShops(@PathVariable UUID id) {
        Brand brand = brandRepo.findById(id).orElse(null);
        if (brand == null) return ResponseEntity.notFound().build();
        List<PublicShopResponse> shops = shopRepo.findByOwnerId(brand.getOwnerId()).stream()
            .filter(s -> s.getStatus() == ShopStatus.ACTIVE)
            .map(s -> {
                PublicShopResponse r = new PublicShopResponse();
                r.setId(s.getId()); r.setName(s.getName()); r.setTagline(s.getTagline());
                r.setCity(s.getCity()); r.setLogoUrl(s.getLogoUrl());
                return r;
            }).toList();
        return ResponseEntity.ok(ApiResponse.ok(shops));
    }
}
