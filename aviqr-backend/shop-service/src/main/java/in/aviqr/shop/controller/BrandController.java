package in.aviqr.shop.controller;
import in.aviqr.shop.dto.*;
import in.aviqr.shop.entity.*;
import in.aviqr.shop.repository.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController @RequestMapping("/api/v1/brands") @RequiredArgsConstructor @Slf4j
public class BrandController {
    private final BrandRepository brandRepo;
    private final ShopRepository shopRepo;
    private final RestTemplate restTemplate;

    @Value("${qr.service.url:http://qr-service}")
    private String qrServiceUrl;

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

    // Real, scannable, backend-tracked QR for the brand's public page — replaces the
    // old client-side-only QR image. Brand has no shop-service Shop of its own, so its
    // own id doubles as the qr-service "shopId" for QrType.BRAND (same convention as
    // Mall's food-court QR, MallController.createMallQrCode).
    @PostMapping("/{id}/qr-code")
    public ResponseEntity<ApiResponse<Map>> createBrandQrCode(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Brand brand = brandRepo.findById(id).orElse(null);
        if (brand == null) return ResponseEntity.notFound().build();
        if (!"ADMIN".equals(role) && !uid.equals(brand.getOwnerId()))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));

        String shopId = id.toString();
        try {
            Map<String, Object> qr = findBrandQr(shopId);
            if (qr == null) {
                try {
                    String url = qrServiceUrl + "/api/v1/qr-codes/internal/shop/" + shopId
                        + "?label=" + brand.getName() + "&type=BRAND";
                    @SuppressWarnings("unchecked")
                    Map<String, Object> createResp = restTemplate.postForObject(url, null, Map.class);
                    qr = createResp != null ? (Map<String, Object>) createResp.get("data") : null;
                } catch (Exception createEx) {
                    // Another concurrent request (e.g. React StrictMode's double-effect in dev, or
                    // a genuine simultaneous double-click) may have just inserted the same
                    // deterministic slug — re-check before giving up.
                    qr = findBrandQr(shopId);
                    if (qr == null) throw createEx;
                }
            }
            return ResponseEntity.ok(ApiResponse.ok("QR ready", qr));
        } catch (Exception e) {
            log.warn("Failed to create QR for brand {}: {}", id, e.getMessage());
            return ResponseEntity.status(502).body(ApiResponse.error("Could not reach qr-service"));
        }
    }

    private Map<String, Object> findBrandQr(String shopId) {
        @SuppressWarnings("unchecked")
        Map<String, Object> listResp = restTemplate.getForObject(
            qrServiceUrl + "/api/v1/qr-codes/shop/" + shopId, Map.class);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> existing = listResp != null
            ? (List<Map<String, Object>>) listResp.get("data") : List.of();
        return existing.stream().filter(q -> "BRAND".equals(q.get("type"))).findFirst().orElse(null);
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
