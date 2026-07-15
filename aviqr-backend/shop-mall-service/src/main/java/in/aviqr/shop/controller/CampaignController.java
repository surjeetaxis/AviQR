package in.aviqr.shop.controller;

import in.aviqr.shop.dto.ApiResponse;
import in.aviqr.shop.dto.CampaignRequest;
import in.aviqr.shop.dto.CampaignResponse;
import in.aviqr.shop.entity.Campaign;
import in.aviqr.shop.entity.CampaignLog;
import in.aviqr.shop.service.CampaignService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * MARKET FEATURE: SMS CRM campaigns REST API — staff-only (owner/manager/admin/support).
 *
 * Endpoints:
 *   POST   /api/v1/campaigns/{shopId}              → create
 *   GET    /api/v1/campaigns/{shopId}               → list
 *   GET    /api/v1/campaigns/{shopId}/{id}           → detail
 *   GET    /api/v1/campaigns/{shopId}/{id}/logs      → delivery log
 *   POST   /api/v1/campaigns/{shopId}/{id}/send      → manual send-now
 *   PUT    /api/v1/campaigns/{shopId}/{id}/pause     → pause a recurring campaign
 *   PUT    /api/v1/campaigns/{shopId}/{id}/resume    → resume a recurring campaign
 *   DELETE /api/v1/campaigns/{shopId}/{id}           → delete
 */
@RestController
@RequestMapping("/api/v1/campaigns")
@RequiredArgsConstructor
public class CampaignController {

    private final CampaignService campaignService;

    @PostMapping("/{shopId}")
    public ResponseEntity<ApiResponse<CampaignResponse>> create(
            @PathVariable String shopId,
            @Valid @RequestBody CampaignRequest req,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canManage(shopId, role, callerShopId)) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok("Campaign created", CampaignResponse.from(campaignService.create(shopId, req))));
    }

    @GetMapping("/{shopId}")
    public ResponseEntity<ApiResponse<List<CampaignResponse>>> list(
            @PathVariable String shopId,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canManage(shopId, role, callerShopId)) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok(campaignService.list(shopId).stream().map(CampaignResponse::from).toList()));
    }

    @GetMapping("/{shopId}/{id}")
    public ResponseEntity<ApiResponse<CampaignResponse>> get(
            @PathVariable String shopId, @PathVariable UUID id,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canManage(shopId, role, callerShopId)) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok(CampaignResponse.from(campaignService.get(id))));
    }

    @GetMapping("/{shopId}/{id}/logs")
    public ResponseEntity<ApiResponse<List<CampaignLog>>> logs(
            @PathVariable String shopId, @PathVariable UUID id,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canManage(shopId, role, callerShopId)) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok(campaignService.getLogs(id)));
    }

    @PostMapping("/{shopId}/{id}/send")
    public ResponseEntity<ApiResponse<CampaignResponse>> sendNow(
            @PathVariable String shopId, @PathVariable UUID id,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canManage(shopId, role, callerShopId)) return forbidden();
        Campaign campaign = campaignService.sendNow(id);
        return ResponseEntity.ok(ApiResponse.ok("Campaign sent", CampaignResponse.from(campaign)));
    }

    @PutMapping("/{shopId}/{id}/pause")
    public ResponseEntity<ApiResponse<CampaignResponse>> pause(
            @PathVariable String shopId, @PathVariable UUID id,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canManage(shopId, role, callerShopId)) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok("Campaign paused", CampaignResponse.from(campaignService.pause(id))));
    }

    @PutMapping("/{shopId}/{id}/resume")
    public ResponseEntity<ApiResponse<CampaignResponse>> resume(
            @PathVariable String shopId, @PathVariable UUID id,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canManage(shopId, role, callerShopId)) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok("Campaign resumed", CampaignResponse.from(campaignService.resume(id))));
    }

    @DeleteMapping("/{shopId}/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable String shopId, @PathVariable UUID id,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canManage(shopId, role, callerShopId)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        campaignService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Campaign deleted", null));
    }

    private <T> ResponseEntity<ApiResponse<T>> forbidden() {
        return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
    }

    // ADMIN/SUPPORT always; otherwise the caller must be staff scoped to this exact shop
    private boolean canManage(String shopId, String role, String callerShopId) {
        if ("CUSTOMER".equals(role) || role.isBlank()) return false;
        if ("ADMIN".equals(role) || "SUPPORT".equals(role)) return true;
        return shopId.equals(callerShopId);
    }
}
