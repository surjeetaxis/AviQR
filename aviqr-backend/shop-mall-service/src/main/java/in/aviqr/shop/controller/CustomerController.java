package in.aviqr.shop.controller;

import in.aviqr.shop.dto.ApiResponse;
import in.aviqr.shop.dto.CustomerLabelRequest;
import in.aviqr.shop.dto.CustomerNotesRequest;
import in.aviqr.shop.dto.CustomerProfileResponse;
import in.aviqr.shop.dto.CustomerUpdateRequest;
import in.aviqr.shop.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * MARKET FEATURE: unified customer profile REST API (CRM foundation).
 *
 * Endpoints:
 *   GET    /api/v1/customers/{shopId}/profile?phone=   → merged profile (staff, or the customer's own verified phone)
 *   PUT    /api/v1/customers/{shopId}/profile           → self-service upsert (staff, or the customer's own verified phone)
 *   GET    /api/v1/customers/{shopId}                   → merged CRM list (staff only)
 *   PUT    /api/v1/customers/{shopId}/profile/notes      → staff-only notes
 *   POST   /api/v1/customers/{shopId}/profile/labels     → staff-only add label
 *   DELETE /api/v1/customers/{shopId}/profile/labels/{label}?phone= → staff-only remove label
 */
@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping("/{shopId}/profile")
    public ResponseEntity<ApiResponse<CustomerProfileResponse>> getProfile(
            @PathVariable String shopId,
            @RequestParam String phone,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId,
            @RequestHeader(value = "X-User-Phone", defaultValue = "") String callerPhone) {
        if (!canAccessProfile(shopId, phone, role, callerShopId, callerPhone))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(customerService.getProfile(shopId, phone)));
    }

    @PutMapping("/{shopId}/profile")
    public ResponseEntity<ApiResponse<Object>> updateProfile(
            @PathVariable String shopId,
            @Valid @RequestBody CustomerUpdateRequest req,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId,
            @RequestHeader(value = "X-User-Phone", defaultValue = "") String callerPhone) {
        if (!canAccessProfile(shopId, req.getPhone(), role, callerShopId, callerPhone))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        var customer = customerService.upsertProfile(shopId, req.getPhone(), req.getName(),
            req.getEmail(), req.getBirthday(), req.getAnniversary());
        return ResponseEntity.ok(ApiResponse.ok("Profile updated", customer));
    }

    @GetMapping("/{shopId}")
    public ResponseEntity<ApiResponse<List<CustomerProfileResponse>>> list(
            @PathVariable String shopId,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canManage(shopId, role, callerShopId))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(customerService.listUnified(shopId)));
    }

    @PutMapping("/{shopId}/profile/notes")
    public ResponseEntity<ApiResponse<Object>> updateNotes(
            @PathVariable String shopId,
            @Valid @RequestBody CustomerNotesRequest req,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canManage(shopId, role, callerShopId))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Notes updated",
            customerService.updateNotes(shopId, req.getPhone(), req.getNotes())));
    }

    @PostMapping("/{shopId}/profile/labels")
    public ResponseEntity<ApiResponse<Object>> addLabel(
            @PathVariable String shopId,
            @Valid @RequestBody CustomerLabelRequest req,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canManage(shopId, role, callerShopId))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Label added",
            customerService.addLabel(shopId, req.getPhone(), req.getLabel())));
    }

    @DeleteMapping("/{shopId}/profile/labels/{label}")
    public ResponseEntity<ApiResponse<Object>> removeLabel(
            @PathVariable String shopId,
            @PathVariable String label,
            @RequestParam String phone,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canManage(shopId, role, callerShopId))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Label removed",
            customerService.removeLabel(shopId, phone, label)));
    }

    // ADMIN/SUPPORT always; otherwise the caller must be staff scoped to this exact shop
    private boolean canManage(String shopId, String role, String callerShopId) {
        if ("CUSTOMER".equals(role) || role.isBlank()) return false;
        if ("ADMIN".equals(role) || "SUPPORT".equals(role)) return true;
        return shopId.equals(callerShopId);
    }

    // Staff may view/edit any customer's profile at their shop; a plain customer may only
    // view/edit the profile bound to their own JWT-verified phone number — never one supplied
    // by an arbitrary caller.
    private boolean canAccessProfile(String shopId, String phone, String role, String callerShopId, String callerPhone) {
        if (canManage(shopId, role, callerShopId)) return true;
        return !callerPhone.isBlank() && callerPhone.equals(phone);
    }
}
