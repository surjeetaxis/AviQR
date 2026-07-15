package in.aviqr.menu.controller;

import in.aviqr.menu.dto.ApiResponse;
import in.aviqr.menu.dto.ShortcodeLookupResponse;
import in.aviqr.menu.entity.MenuShortcode;
import in.aviqr.menu.service.ShortcodeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/shortcodes")
@RequiredArgsConstructor
public class ShortcodeController {

    private final ShortcodeService shortcodeSvc;

    private boolean isStaff(String role) {
        return !"CUSTOMER".equals(role) && !role.isBlank();
    }

    private boolean canAccessShop(String role, String shopId, String callerShopId) {
        if ("CUSTOMER".equals(role) || role.isBlank()) return false;
        if ("ADMIN".equals(role) || "SUPPORT".equals(role)) return true;
        return shopId.equals(callerShopId);
    }

    @GetMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<List<MenuShortcode>>> getByShop(
            @PathVariable String shopId,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canAccessShop(role, shopId, callerShopId))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(shortcodeSvc.getByShop(shopId)));
    }

    @GetMapping("/shop/{shopId}/lookup")
    public ResponseEntity<ApiResponse<ShortcodeLookupResponse>> lookup(
            @PathVariable String shopId,
            @RequestParam String code,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canAccessShop(role, shopId, callerShopId))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        try {
            return ResponseEntity.ok(ApiResponse.ok(shortcodeSvc.lookup(shopId, code)));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(ApiResponse.error("Shortcode not found"));
        }
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MenuShortcode>> create(
            @RequestBody MenuShortcode shortcode,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        try {
            return ResponseEntity.ok(ApiResponse.ok(shortcodeSvc.create(shortcode)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MenuShortcode>> update(
            @PathVariable UUID id, @RequestBody MenuShortcode shortcode,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(shortcodeSvc.update(id, shortcode)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        shortcodeSvc.delete(id);
        return ResponseEntity.ok(ApiResponse.<Void>ok(null));
    }
}
