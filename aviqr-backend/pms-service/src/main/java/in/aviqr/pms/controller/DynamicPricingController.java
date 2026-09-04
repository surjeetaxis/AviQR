package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.dto.PricingSuggestion;
import in.aviqr.pms.entity.DynamicPricingConfig;
import in.aviqr.pms.service.DynamicPricingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class DynamicPricingController {

    private final DynamicPricingService pricingService;
    private final HotelServiceClient hotelServiceClient;

    @GetMapping("/api/v1/pms/pricing/hotel/{hotelId}/config")
    public ResponseEntity<ApiResponse<DynamicPricingConfig>> getConfig(
            @PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(pricingService.getConfig(hotelId)));
    }

    @PutMapping("/api/v1/pms/pricing/hotel/{hotelId}/config")
    public ResponseEntity<ApiResponse<DynamicPricingConfig>> updateConfig(
            @PathVariable UUID hotelId, @RequestBody DynamicPricingConfig req,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Saved", pricingService.updateConfig(hotelId, req)));
    }

    @GetMapping("/api/v1/pms/pricing/hotel/{hotelId}/suggest")
    public ResponseEntity<ApiResponse<PricingSuggestion>> suggest(
            @PathVariable UUID hotelId, @RequestParam UUID roomTypeId, @RequestParam UUID ratePlanId, @RequestParam LocalDate date,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(pricingService.suggest(hotelId, roomTypeId, ratePlanId, date)));
    }
}
