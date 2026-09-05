package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.Invoice;
import in.aviqr.pms.entity.InvoiceNumberConfig;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.service.InvoiceService;
import in.aviqr.pms.service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final ReservationService reservationService;
    private final HotelServiceClient hotelServiceClient;

    @GetMapping("/api/v1/pms/reservations/{id}/invoice")
    public ResponseEntity<ApiResponse<Invoice>> get(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Reservation reservation = reservationService.get(id);
        if (!hotelServiceClient.hasAccess(reservation.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(invoiceService.get(id)));
    }

    @GetMapping("/api/v1/pms/invoices/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<Invoice>>> listForHotel(
            @PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(invoiceService.listForHotel(hotelId)));
    }

    @GetMapping("/api/v1/pms/invoice-settings/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<InvoiceNumberConfig>> getConfig(
            @PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(invoiceService.getConfig(hotelId)));
    }

    @PutMapping("/api/v1/pms/invoice-settings/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<InvoiceNumberConfig>> updateConfig(
            @PathVariable UUID hotelId, @RequestBody InvoiceNumberConfig req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Saved", invoiceService.updateConfig(hotelId, req)));
    }
}
