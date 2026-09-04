package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.Surcharge;
import in.aviqr.pms.service.SurchargeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class SurchargeController {

    private final SurchargeService surchargeService;
    private final HotelServiceClient hotelServiceClient;

    @PostMapping("/api/v1/pms/surcharges")
    public ResponseEntity<ApiResponse<Surcharge>> create(
            @RequestBody Surcharge req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(req.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Created", surchargeService.create(req)));
    }

    @GetMapping("/api/v1/pms/surcharges/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<Surcharge>>> listForHotel(
            @PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(surchargeService.listForHotel(hotelId)));
    }

    @PutMapping("/api/v1/pms/surcharges/{id}")
    public ResponseEntity<ApiResponse<Surcharge>> update(
            @PathVariable UUID id, @RequestBody Surcharge req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Surcharge existing = surchargeService.get(id);
        if (!hotelServiceClient.hasAccess(existing.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Updated", surchargeService.update(id, req)));
    }
}
