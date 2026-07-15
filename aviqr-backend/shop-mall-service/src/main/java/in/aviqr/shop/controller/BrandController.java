package in.aviqr.shop.controller;
import in.aviqr.shop.dto.*;
import in.aviqr.shop.entity.*;
import in.aviqr.shop.repository.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.ResolvableType;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController @RequestMapping("/api/v1/brands") @RequiredArgsConstructor @Slf4j
public class BrandController {
    private final BrandRepository brandRepo;
    private final ShopRepository shopRepo;
    private final RestTemplate restTemplate;

    @Value("${qr.service.url:http://order-qr-service}")
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

    // MARKET FEATURE: head-office rollup — revenue/orders across every outlet the
    // caller owns, grouped by city and by zone. Self-scoped (no shopId param): resolves
    // the caller's own shops via X-User-Id, same as /my. Fans out to
    // notification-report-review-service's existing per-shop revenue endpoint via a
    // trusted internal RestTemplate call (X-User-Role: SUPPORT bypasses that service's
    // per-request X-Shop-Id check — same pattern SellerTierService already uses).
    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<Map<String, Object>>> overview(
            @RequestHeader("X-User-Id") String uid,
            @RequestParam(defaultValue = "7") int days) {
        List<Shop> shops = shopRepo.findByOwnerId(uid);
        List<Map<String, Object>> byOutlet = new ArrayList<>();
        for (Shop shop : shops) {
            List<Map<String, Object>> revenueRows = fetchShopRevenue(shop.getId().toString(), days);
            BigDecimal revenue = BigDecimal.ZERO;
            long orders = 0;
            for (Map<String, Object> row : revenueRows) {
                revenue = revenue.add(toBigDecimal(row.get("revenue")));
                orders += toLong(row.get("orders"));
            }
            Map<String, Object> outlet = new LinkedHashMap<>();
            outlet.put("shopId", shop.getId());
            outlet.put("name", shop.getName());
            outlet.put("city", shop.getCity());
            outlet.put("zone", shop.getZone());
            outlet.put("revenue", revenue);
            outlet.put("orders", orders);
            byOutlet.add(outlet);
        }

        BigDecimal totalRevenue = byOutlet.stream()
            .map(o -> (BigDecimal) o.get("revenue")).reduce(BigDecimal.ZERO, BigDecimal::add);
        long totalOrders = byOutlet.stream().mapToLong(o -> (Long) o.get("orders")).sum();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalRevenue", totalRevenue);
        result.put("totalOrders", totalOrders);
        result.put("outletCount", shops.size());
        result.put("byCity", groupBy(byOutlet, "city"));
        result.put("byZone", groupBy(byOutlet, "zone"));
        result.put("byOutlet", byOutlet);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    private List<Map<String, Object>> fetchShopRevenue(String shopId, int days) {
        try {
            String url = "http://notification-report-review-service/api/v1/reports/shop/" + shopId + "/revenue?days=" + days;
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-Role", "SUPPORT");
            ParameterizedTypeReference<ApiResponse<List<Map<String, Object>>>> ref = ParameterizedTypeReference.forType(
                ResolvableType.forClassWithGenerics(ApiResponse.class,
                    ResolvableType.forClassWithGenerics(List.class, Map.class)).getType());
            ResponseEntity<ApiResponse<List<Map<String, Object>>>> resp = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), ref);
            return resp.getBody() != null && resp.getBody().getData() != null ? resp.getBody().getData() : List.of();
        } catch (Exception e) {
            log.warn("Revenue fetch failed for shop {}: {}", shopId, e.getMessage());
            return List.of();
        }
    }

    // Groups outlets by a string key (city or zone), summing revenue/orders per group.
    // Outlets with a null/blank value for that key are grouped under "Unassigned".
    private List<Map<String, Object>> groupBy(List<Map<String, Object>> byOutlet, String key) {
        Map<String, List<Map<String, Object>>> grouped = byOutlet.stream()
            .collect(Collectors.groupingBy(o -> {
                Object v = o.get(key);
                return v == null || v.toString().isBlank() ? "Unassigned" : v.toString();
            }, LinkedHashMap::new, Collectors.toList()));
        List<Map<String, Object>> result = new ArrayList<>();
        grouped.forEach((groupKey, outlets) -> {
            BigDecimal revenue = outlets.stream().map(o -> (BigDecimal) o.get("revenue")).reduce(BigDecimal.ZERO, BigDecimal::add);
            long orders = outlets.stream().mapToLong(o -> (Long) o.get("orders")).sum();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put(key, groupKey);
            row.put("revenue", revenue);
            row.put("orders", orders);
            row.put("outletCount", outlets.size());
            result.add(row);
        });
        result.sort((a, b) -> ((BigDecimal) b.get("revenue")).compareTo((BigDecimal) a.get("revenue")));
        return result;
    }

    private BigDecimal toBigDecimal(Object v) {
        if (v == null) return BigDecimal.ZERO;
        if (v instanceof BigDecimal bd) return bd;
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        try { return new BigDecimal(v.toString()); } catch (Exception e) { return BigDecimal.ZERO; }
    }

    private long toLong(Object v) {
        if (v == null) return 0;
        if (v instanceof Number n) return n.longValue();
        try { return Long.parseLong(v.toString()); } catch (Exception e) { return 0; }
    }
}
