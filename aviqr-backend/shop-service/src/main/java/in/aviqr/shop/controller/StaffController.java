package in.aviqr.shop.controller;

import in.aviqr.shop.dto.ApiResponse;
import in.aviqr.shop.entity.*;
import in.aviqr.shop.repository.StaffRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/staff")
@RequiredArgsConstructor
public class StaffController {

    private final StaffRepository staffRepo;

    @GetMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<List<ShopStaff>>> getStaff(@PathVariable UUID shopId) {
        return ResponseEntity.ok(ApiResponse.ok(staffRepo.findByShopId(shopId)));
    }

    @PostMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<ShopStaff>> addStaff(
            @PathVariable UUID shopId,
            @RequestBody ShopStaff req,
            @RequestHeader("X-User-Id") String uid) {
        req.setShopId(shopId);
        if (req.getUserId() == null) req.setUserId(UUID.randomUUID().toString()); // placeholder
        return ResponseEntity.ok(ApiResponse.ok("Staff added", staffRepo.save(req)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ShopStaff>> updateStaff(@PathVariable UUID id, @RequestBody ShopStaff req) {
        return staffRepo.findById(id).map(s -> {
            s.setName(req.getName()); s.setRole(req.getRole());
            if (req.getPermissions() != null) s.setPermissions(req.getPermissions());
            s.setActive(req.getActive());
            return ResponseEntity.ok(ApiResponse.ok("Updated", staffRepo.save(s)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<ApiResponse<Void>> changeRole(
            @PathVariable UUID id, @RequestParam String role) {
        staffRepo.findById(id).ifPresent(s -> {
            s.setRole(StaffRole.valueOf(role.toUpperCase()));
            staffRepo.save(s);
        });
        return ResponseEntity.ok(ApiResponse.ok("Role updated", null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> removeStaff(@PathVariable UUID id) {
        staffRepo.findById(id).ifPresent(s -> { s.setActive(false); staffRepo.save(s); });
        return ResponseEntity.ok(ApiResponse.ok("Staff removed", null));
    }
}
