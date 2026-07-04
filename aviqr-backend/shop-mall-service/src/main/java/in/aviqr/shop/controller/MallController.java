package in.aviqr.shop.controller;
import in.aviqr.shop.dto.ApiResponse;
import in.aviqr.shop.entity.*;
import in.aviqr.shop.repository.*;
import in.aviqr.shop.security.VendorTokenService;
import in.aviqr.shop.service.ShopService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.util.*;
import java.util.stream.Collectors;

@RestController @RequiredArgsConstructor @Slf4j
public class MallController {
    private final MallRepository mallRepo;
    private final VendorRepository vendorRepo;
    private final VendorTokenService vendorTokenService;
    private final RestTemplate restTemplate;
    private final ShopService shopService;

    @Value("${qr.service.url:http://order-qr-service}")
    private String qrServiceUrl;

    @PostMapping("/api/v1/malls")
    public ResponseEntity<ApiResponse<Mall>> create(@RequestBody Mall mall, @RequestHeader("X-User-Id") String uid) {
        mall.setAdminId(uid);
        return ResponseEntity.ok(ApiResponse.ok("Created", mallRepo.save(mall)));
    }

    @GetMapping("/api/v1/malls/my")
    public ResponseEntity<ApiResponse<List<Mall>>> myMalls(@RequestHeader("X-User-Id") String uid) {
        // Ordered so dashboards that default to "my malls[0]" (Mall dashboard, Reports tab)
        // deterministically land on the admin's first-registered mall instead of
        // whatever order an unordered scan happens to return.
        return ResponseEntity.ok(ApiResponse.ok(mallRepo.findByAdminIdOrderByCreatedAtAsc(uid)));
    }

    @GetMapping("/api/v1/malls/{id}")
    public ResponseEntity<ApiResponse<Mall>> get(@PathVariable UUID id) {
        return mallRepo.findById(id).map(m -> ResponseEntity.ok(ApiResponse.ok(m))).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/api/v1/malls/{id}")
    public ResponseEntity<ApiResponse<Mall>> update(@PathVariable UUID id, @RequestBody Mall req) {
        return mallRepo.findById(id).map(m -> {
            m.setName(req.getName()); m.setCity(req.getCity()); m.setPhone(req.getPhone());
            if(req.getCommissionPercent()!=null) m.setCommissionPercent(req.getCommissionPercent());
            return ResponseEntity.ok(ApiResponse.ok("Updated", mallRepo.save(m)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/api/v1/malls")
    public ResponseEntity<ApiResponse<List<Mall>>> all(
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!"ADMIN".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(mallRepo.findAll()));
    }

    // Vendors
    @GetMapping("/api/v1/vendors/mall/{mallId}")
    public ResponseEntity<ApiResponse<List<Vendor>>> getVendors(@PathVariable UUID mallId) {
        return ResponseEntity.ok(ApiResponse.ok(vendorRepo.findByMallId(mallId)));
    }

    @PostMapping("/api/v1/vendors")
    public ResponseEntity<ApiResponse<Vendor>> addVendor(
            @RequestBody Vendor v,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!"ADMIN".equals(role)) {
            boolean owns = v.getMallId() != null &&
                mallRepo.findById(v.getMallId()).map(m -> uid.equals(m.getAdminId())).orElse(false);
            if (!owns) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        }
        return ResponseEntity.ok(ApiResponse.ok("Added", vendorRepo.save(v)));
    }

    @PutMapping("/api/v1/vendors/{id}/status")
    public ResponseEntity<ApiResponse<Void>> toggleVendor(@PathVariable UUID id, @RequestParam boolean active) {
        vendorRepo.findById(id).ifPresent(v -> { v.setActive(active); vendorRepo.save(v); });
        return ResponseEntity.ok(ApiResponse.ok("Updated", null));
    }

    @PutMapping("/api/v1/vendors/{id}/qr")
    public ResponseEntity<ApiResponse<Void>> toggleVendorQr(@PathVariable UUID id, @RequestParam boolean active) {
        vendorRepo.findById(id).ifPresent(v -> { v.setQrActive(active); vendorRepo.save(v); });
        return ResponseEntity.ok(ApiResponse.ok("Updated", null));
    }

    @DeleteMapping("/api/v1/vendors/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteVendor(@PathVariable UUID id) {
        vendorRepo.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok("Deleted", null));
    }

    // Verifies the caller admins this vendor's mall (or is ADMIN), then mints a short-lived
    // JWT scoped to the vendor's shop so report-service's per-shop revenue check (and any
    // other shop/order/menu/qr/payment-service call) authorizes correctly — same mechanism
    // as hotel-service's hotel-outlets/{id}/enter.
    @PostMapping("/api/v1/vendors/{id}/enter")
    public ResponseEntity<ApiResponse<Map<String, String>>> enterVendor(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Vendor v = vendorRepo.findById(id).orElse(null);
        if (v == null) return ResponseEntity.notFound().build();
        if (!"ADMIN".equals(role)) {
            boolean owns = v.getMallId() != null &&
                mallRepo.findById(v.getMallId()).map(m -> uid.equals(m.getAdminId())).orElse(false);
            if (!owns) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        }
        if (v.getShopId() == null || v.getShopId().isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("Vendor has no linked shop"));
        String token = vendorTokenService.mintVendorToken(uid, v.getShopId());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("accessToken", token, "shopId", v.getShopId())));
    }

    // Convenience: QR-enable a vendor in one call instead of the frontend orchestrating
    // mall-service + qr-service — same pattern as hotel-service's hotel-outlets/{id}/qr-code.
    @PostMapping("/api/v1/vendors/{id}/qr-code")
    public ResponseEntity<ApiResponse<Map>> createVendorQrCode(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Vendor v = vendorRepo.findById(id).orElse(null);
        if (v == null) return ResponseEntity.notFound().build();
        if (!"ADMIN".equals(role)) {
            boolean owns = v.getMallId() != null &&
                mallRepo.findById(v.getMallId()).map(m -> uid.equals(m.getAdminId())).orElse(false);
            if (!owns) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        }
        if (v.getShopId() == null || v.getShopId().isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("Vendor has no linked shop"));
        try {
            String url = qrServiceUrl + "/api/v1/qr-codes/internal/shop/" + v.getShopId()
                + "?label=" + v.getName() + "&type=SHOP&group=" + v.getMallId();
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restTemplate.postForObject(url, null, Map.class);
            return ResponseEntity.ok(ApiResponse.ok("QR created", resp));
        } catch (Exception e) {
            log.warn("Failed to create QR for vendor {}: {}", id, e.getMessage());
            return ResponseEntity.status(502).body(ApiResponse.error("Could not reach qr-service"));
        }
    }

    // Real, scannable, backend-tracked QR for the mall's food-court landing page —
    // replaces the old client-side-only QR image. Mall has no shop-service Shop of its
    // own, so its own id doubles as the qr-service "shopId" for QrType.MALL.
    @PostMapping("/api/v1/malls/{id}/qr-code")
    public ResponseEntity<ApiResponse<Map>> createMallQrCode(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Mall mall = mallRepo.findById(id).orElse(null);
        if (mall == null) return ResponseEntity.notFound().build();
        if (!"ADMIN".equals(role) && !uid.equals(mall.getAdminId()))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));

        String shopId = id.toString();
        try {
            Map<String, Object> qr = findMallQr(shopId);
            if (qr == null) {
                try {
                    String url = qrServiceUrl + "/api/v1/qr-codes/internal/shop/" + shopId
                        + "?label=" + mall.getName() + "&type=MALL";
                    @SuppressWarnings("unchecked")
                    Map<String, Object> createResp = restTemplate.postForObject(url, null, Map.class);
                    qr = createResp != null ? (Map<String, Object>) createResp.get("data") : null;
                } catch (Exception createEx) {
                    // Another concurrent request (e.g. React StrictMode's double-effect in dev, or
                    // a genuine simultaneous double-click) may have just inserted the same
                    // deterministic slug — re-check before giving up.
                    qr = findMallQr(shopId);
                    if (qr == null) throw createEx;
                }
            }
            return ResponseEntity.ok(ApiResponse.ok("QR ready", qr));
        } catch (Exception e) {
            log.warn("Failed to create QR for mall {}: {}", id, e.getMessage());
            return ResponseEntity.status(502).body(ApiResponse.error("Could not reach qr-service"));
        }
    }

    private Map<String, Object> findMallQr(String shopId) {
        @SuppressWarnings("unchecked")
        Map<String, Object> listResp = restTemplate.getForObject(
            qrServiceUrl + "/api/v1/qr-codes/shop/" + shopId, Map.class);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> existing = listResp != null
            ? (List<Map<String, Object>>) listResp.get("data") : List.of();
        return existing.stream().filter(q -> "MALL".equals(q.get("type"))).findFirst().orElse(null);
    }

    // Looks up a shop by id. Returns null if it doesn't exist — callers treat that as
    // "not found". Was a RestTemplate call to shop-service before mall-service merged
    // into it; now it's the same JVM, so a direct repository lookup replaces the loopback.
    private Shop fetchShop(String shopId) {
        try {
            return shopService.findRaw(UUID.fromString(shopId)).orElse(null);
        } catch (Exception e) {
            log.warn("Could not fetch shop {}: {}", shopId, e.getMessage());
            return null;
        }
    }

    // Mall admin enters a restaurant's shop id and sends a link request. Looks the shop up in
    // shop-service (for its real name) rather than trusting a client-supplied name, and creates
    // a PENDING vendor row the shop's owner must accept/reject via /respond below.
    @PostMapping("/api/v1/vendors/request")
    public ResponseEntity<ApiResponse<Vendor>> requestVendor(
            @RequestBody Map<String, String> body,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        UUID mallId;
        try {
            mallId = UUID.fromString(body.get("mallId"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid mallId"));
        }
        String shopId = body.get("shopId");
        if (shopId == null || shopId.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("Restaurant ID is required"));

        if (!"ADMIN".equals(role)) {
            UUID finalMallId = mallId;
            boolean owns = mallRepo.findById(finalMallId).map(m -> uid.equals(m.getAdminId())).orElse(false);
            if (!owns) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        }

        Optional<Vendor> existing = vendorRepo.findByMallIdAndShopId(mallId, shopId);
        if (existing.isPresent() && existing.get().getStatus() != VendorStatus.REJECTED)
            return ResponseEntity.status(409).body(ApiResponse.error(
                existing.get().getStatus() == VendorStatus.PENDING
                    ? "A request is already pending for this restaurant"
                    : "This restaurant is already linked"));

        Shop shop = fetchShop(shopId);
        if (shop == null)
            return ResponseEntity.status(404).body(ApiResponse.error("Restaurant not found"));

        Vendor v = existing.orElseGet(Vendor::new); // reuse the row if re-requesting after a rejection
        v.setMallId(mallId);
        v.setShopId(shopId);
        v.setName(shop.getName());
        v.setStatus(VendorStatus.PENDING);
        v.setActive(false);
        return ResponseEntity.ok(ApiResponse.ok("Request sent", vendorRepo.save(v)));
    }

    // Restaurant owner's side: pending mall-link requests across all shops they manage.
    @GetMapping("/api/v1/vendors/requests/mine")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> myRequests(@RequestParam String shopIds) {
        List<String> ids = Arrays.stream(shopIds.split(","))
            .map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toList());
        if (ids.isEmpty()) return ResponseEntity.ok(ApiResponse.ok(List.of()));

        List<Map<String, Object>> result = vendorRepo.findByShopIdInAndStatus(ids, VendorStatus.PENDING).stream()
            .map(v -> {
                Mall mall = mallRepo.findById(v.getMallId()).orElse(null);
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", v.getId());
                m.put("shopId", v.getShopId());
                m.put("mallId", v.getMallId());
                m.put("mallName", mall != null ? mall.getName() : "Unknown Mall");
                m.put("mallCity", mall != null ? mall.getCity() : null);
                m.put("createdAt", v.getCreatedAt());
                return m;
            })
            .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // Restaurant owner accepts or rejects a pending mall-link request. Only on ACCEPT does
    // the vendor become publicly visible (feeds the Mall's Vendors tab, Reports, and the
    // Food Court QR's public restaurant list).
    @PutMapping("/api/v1/vendors/{id}/respond")
    public ResponseEntity<ApiResponse<Vendor>> respond(
            @PathVariable UUID id,
            @RequestParam String decision,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Vendor v = vendorRepo.findById(id).orElse(null);
        if (v == null) return ResponseEntity.notFound().build();
        if (v.getStatus() != VendorStatus.PENDING)
            return ResponseEntity.badRequest().body(ApiResponse.error("This request has already been resolved"));

        if (!"ADMIN".equals(role)) {
            Shop shop = fetchShop(v.getShopId());
            boolean owns = shop != null && uid.equals(shop.getOwnerId());
            if (!owns) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        }

        if ("ACCEPT".equalsIgnoreCase(decision)) {
            v.setStatus(VendorStatus.ACTIVE);
            v.setActive(true);
        } else if ("REJECT".equalsIgnoreCase(decision)) {
            v.setStatus(VendorStatus.REJECTED);
        } else {
            return ResponseEntity.badRequest().body(ApiResponse.error("decision must be ACCEPT or REJECT"));
        }
        return ResponseEntity.ok(ApiResponse.ok("Updated", vendorRepo.save(v)));
    }

    // Public food-court menu — only restaurants that have accepted the mall's link request.
    @GetMapping("/api/v1/malls/public/{mallId}/vendors")
    public ResponseEntity<ApiResponse<List<Vendor>>> publicVendors(@PathVariable UUID mallId) {
        return ResponseEntity.ok(ApiResponse.ok(vendorRepo.findByMallIdAndStatusAndActiveTrue(mallId, VendorStatus.ACTIVE)));
    }

    // Public mall info (Food Court QR Flow header) — the gateway only permits unauthenticated
    // access under /api/v1/malls/public/**, unlike the authenticated GET /api/v1/malls/{id}.
    @GetMapping("/api/v1/malls/public/{id}")
    public ResponseEntity<ApiResponse<Mall>> publicMall(@PathVariable UUID id) {
        return mallRepo.findById(id).map(m -> ResponseEntity.ok(ApiResponse.ok(m))).orElse(ResponseEntity.notFound().build());
    }
}
