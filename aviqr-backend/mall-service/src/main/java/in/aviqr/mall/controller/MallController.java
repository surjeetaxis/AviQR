package in.aviqr.mall.controller;
import in.aviqr.mall.dto.ApiResponse;
import in.aviqr.mall.entity.*;
import in.aviqr.mall.repository.*;
import in.aviqr.mall.security.VendorTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequiredArgsConstructor
public class MallController {
    private final MallRepository mallRepo;
    private final VendorRepository vendorRepo;
    private final VendorTokenService vendorTokenService;

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

    // Public mall menu — all active vendors
    @GetMapping("/api/v1/malls/public/{mallId}/vendors")
    public ResponseEntity<ApiResponse<List<Vendor>>> publicVendors(@PathVariable UUID mallId) {
        return ResponseEntity.ok(ApiResponse.ok(vendorRepo.findByMallIdAndActiveTrue(mallId)));
    }
}