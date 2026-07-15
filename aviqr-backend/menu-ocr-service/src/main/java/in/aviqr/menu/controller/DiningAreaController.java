package in.aviqr.menu.controller;

import in.aviqr.menu.dto.ApiResponse;
import in.aviqr.menu.entity.AreaMenuPrice;
import in.aviqr.menu.entity.DiningArea;
import in.aviqr.menu.service.DiningAreaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/dining-areas")
@RequiredArgsConstructor
public class DiningAreaController {

    private final DiningAreaService areaSvc;

    private boolean isStaff(String role) {
        return !"CUSTOMER".equals(role) && !role.isBlank();
    }

    private boolean canAccessShop(String role, String shopId, String callerShopId) {
        if ("CUSTOMER".equals(role) || role.isBlank()) return false;
        if ("ADMIN".equals(role) || "SUPPORT".equals(role)) return true;
        return shopId.equals(callerShopId);
    }

    @GetMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<List<DiningArea>>> getByShop(
            @PathVariable String shopId,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canAccessShop(role, shopId, callerShopId))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(areaSvc.getByShop(shopId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DiningArea>> create(
            @RequestBody DiningArea area,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(areaSvc.create(area)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DiningArea>> update(
            @PathVariable UUID id, @RequestBody DiningArea area,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(areaSvc.update(id, area)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        areaSvc.delete(id);
        return ResponseEntity.ok(ApiResponse.<Void>ok(null));
    }

    @GetMapping("/{id}/prices")
    public ResponseEntity<ApiResponse<List<AreaMenuPrice>>> getPrices(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(areaSvc.getPrices(id)));
    }

    @PutMapping("/{id}/prices")
    public ResponseEntity<ApiResponse<List<AreaMenuPrice>>> savePrices(
            @PathVariable UUID id, @RequestBody List<AreaMenuPrice> prices,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(areaSvc.savePrices(id, prices)));
    }
}
