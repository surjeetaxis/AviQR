package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.LoyaltyProgramConfig;
import in.aviqr.pms.service.LoyaltyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class LoyaltyController {

    private final LoyaltyService loyaltyService;
    private final HotelServiceClient hotelServiceClient;

    @GetMapping("/api/v1/pms/loyalty/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<LoyaltyProgramConfig>> getConfig(
            @PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(loyaltyService.getConfig(hotelId)));
    }

    @PutMapping("/api/v1/pms/loyalty/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<LoyaltyProgramConfig>> updateConfig(
            @PathVariable UUID hotelId, @RequestBody Map<String, Object> body,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        var earnRate = body.get("earnRatePercent") != null ? new java.math.BigDecimal(body.get("earnRatePercent").toString()) : null;
        var redemptionValue = body.get("redemptionValue") != null ? new java.math.BigDecimal(body.get("redemptionValue").toString()) : null;
        Boolean active = body.get("active") != null ? Boolean.valueOf(body.get("active").toString()) : null;
        return ResponseEntity.ok(ApiResponse.ok("Saved", loyaltyService.updateConfig(hotelId, earnRate, redemptionValue, active)));
    }
}
