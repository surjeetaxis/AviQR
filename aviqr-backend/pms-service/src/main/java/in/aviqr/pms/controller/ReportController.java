package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.dto.ChainNightAuditReport;
import in.aviqr.pms.dto.NightAuditReport;
import in.aviqr.pms.dto.RevenueRow;
import in.aviqr.pms.service.ChainReportService;
import in.aviqr.pms.service.NightAuditService;
import in.aviqr.pms.service.RevenueReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController @RequiredArgsConstructor @Slf4j
public class ReportController {

    private final NightAuditService nightAuditService;
    private final ChainReportService chainReportService;
    private final RevenueReportService revenueReportService;
    private final HotelServiceClient hotelServiceClient;

    @GetMapping("/api/v1/pms/reports/night-audit/{hotelId}")
    public ResponseEntity<ApiResponse<NightAuditReport>> forDate(
            @PathVariable UUID hotelId,
            @RequestParam(required=false) String date,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        LocalDate d = date != null ? LocalDate.parse(date) : LocalDate.now();
        return ResponseEntity.ok(ApiResponse.ok(nightAuditService.forDate(hotelId, d)));
    }

    @GetMapping("/api/v1/pms/reports/night-audit/{hotelId}/range")
    public ResponseEntity<ApiResponse<List<NightAuditReport>>> forRange(
            @PathVariable UUID hotelId,
            @RequestParam String from, @RequestParam String to,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(nightAuditService.forRange(hotelId, LocalDate.parse(from), LocalDate.parse(to))));
    }

    @GetMapping("/api/v1/pms/reports/revenue/{hotelId}")
    public ResponseEntity<ApiResponse<Map<String,List<RevenueRow>>>> revenue(
            @PathVariable UUID hotelId,
            @RequestParam String from, @RequestParam String to,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        LocalDate f = LocalDate.parse(from), t = LocalDate.parse(to);
        Map<String,List<RevenueRow>> result = Map.of(
            "byRoomType", revenueReportService.byRoomType(hotelId, f, t),
            "bySource", revenueReportService.bySource(hotelId, f, t),
            "byPaymentMethod", revenueReportService.byPaymentMethod(hotelId, f, t));
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // Access is enforced by hotel-service's ChainController (only the chain's owner or
    // ADMIN/SUPPORT can list its hotels) — a Forbidden there propagates as one here too.
    @GetMapping("/api/v1/pms/reports/chain/{chainId}")
    public ResponseEntity<ApiResponse<ChainNightAuditReport>> chainForDate(
            @PathVariable UUID chainId,
            @RequestParam(required=false) String date,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        LocalDate d = date != null ? LocalDate.parse(date) : LocalDate.now();
        try {
            return ResponseEntity.ok(ApiResponse.ok(chainReportService.forDate(chainId, d, uid, role)));
        } catch (HttpClientErrorException.Forbidden e) {
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        } catch (Exception e) {
            log.warn("Chain report failed for {}: {}", chainId, e.getMessage());
            return ResponseEntity.status(502).body(ApiResponse.error("Could not reach hotel-service"));
        }
    }
}
