package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.CommissionStatus;
import in.aviqr.pms.entity.ReservationCommission;
import in.aviqr.pms.service.CommissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class CommissionController {

    private final CommissionService commissionService;
    private final HotelServiceClient hotelServiceClient;

    @GetMapping("/api/v1/pms/commissions/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<ReservationCommission>>> listForHotel(
            @PathVariable UUID hotelId,
            @RequestParam(required=false) String status,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        CommissionStatus s = status != null ? CommissionStatus.valueOf(status.toUpperCase()) : null;
        return ResponseEntity.ok(ApiResponse.ok(commissionService.listForHotel(hotelId, s)));
    }

    @PutMapping("/api/v1/pms/commissions/{id}/pay")
    public ResponseEntity<ApiResponse<ReservationCommission>> markPaid(
            @PathVariable UUID id,
            @RequestParam(required=false) String reference,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        ReservationCommission existing = commissionService.get(id);
        if (!hotelServiceClient.hasAccess(existing.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Marked paid", commissionService.markPaid(id, uid, reference)));
    }
}
