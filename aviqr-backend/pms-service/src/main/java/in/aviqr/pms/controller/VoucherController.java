package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.Voucher;
import in.aviqr.pms.service.VoucherService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class VoucherController {

    private final VoucherService voucherService;
    private final HotelServiceClient hotelServiceClient;

    @PostMapping("/api/v1/pms/vouchers")
    public ResponseEntity<ApiResponse<Voucher>> issue(
            @RequestBody Voucher req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(req.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Voucher issued", voucherService.issue(req.getHotelId(), req.getCode(), req.getInitialValue())));
    }

    @GetMapping("/api/v1/pms/vouchers/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<Voucher>>> listForHotel(
            @PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(voucherService.listForHotel(hotelId)));
    }
}
