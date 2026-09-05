package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.dto.ReservationImportResult;
import in.aviqr.pms.service.ReservationImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController @RequiredArgsConstructor
public class ReservationImportController {

    private final ReservationImportService importService;
    private final HotelServiceClient hotelServiceClient;

    @PostMapping(value = "/api/v1/pms/hotels/{hotelId}/import/reservations", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<ReservationImportResult>> importReservations(
            @PathVariable UUID hotelId, @RequestParam("file") MultipartFile file,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        if (file.isEmpty())
            return ResponseEntity.badRequest().body(ApiResponse.error("No file uploaded"));
        return ResponseEntity.ok(ApiResponse.ok("Import complete", importService.importCsv(hotelId, file)));
    }
}
