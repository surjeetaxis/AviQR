package in.aviqr.mall.controller;
import in.aviqr.mall.dto.ApiResponse;
import in.aviqr.mall.entity.*;
import in.aviqr.mall.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequiredArgsConstructor
public class MallController {
    private final MallRepository mallRepo;
    private final VendorRepository vendorRepo;

    @PostMapping("/api/v1/malls")
    public ResponseEntity<ApiResponse<Mall>> create(@RequestBody Mall mall, @RequestHeader("X-User-Id") String uid) {
        mall.setAdminId(uid);
        return ResponseEntity.ok(ApiResponse.ok("Created", mallRepo.save(mall)));
    }

    @GetMapping("/api/v1/malls/my")
    public ResponseEntity<ApiResponse<List<Mall>>> myMalls(@RequestHeader("X-User-Id") String uid) {
        return ResponseEntity.ok(ApiResponse.ok(mallRepo.findByAdminId(uid)));
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
    public ResponseEntity<ApiResponse<List<Mall>>> all() { return ResponseEntity.ok(ApiResponse.ok(mallRepo.findAll())); }

    // Vendors
    @GetMapping("/api/v1/vendors/mall/{mallId}")
    public ResponseEntity<ApiResponse<List<Vendor>>> getVendors(@PathVariable UUID mallId) {
        return ResponseEntity.ok(ApiResponse.ok(vendorRepo.findByMallId(mallId)));
    }

    @PostMapping("/api/v1/vendors")
    public ResponseEntity<ApiResponse<Vendor>> addVendor(@RequestBody Vendor v) {
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

    // Public mall menu — all active vendors
    @GetMapping("/api/v1/malls/public/{mallId}/vendors")
    public ResponseEntity<ApiResponse<List<Vendor>>> publicVendors(@PathVariable UUID mallId) {
        return ResponseEntity.ok(ApiResponse.ok(vendorRepo.findByMallIdAndActiveTrue(mallId)));
    }
}