package in.aviqr.pms.controller;

import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.dto.ContactlessCheckInRequest;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Public — the guest has no AviQR user JWT before ever visiting the hotel, so these
 *  are gateway-routed without AuthenticationFilter and authenticated by the phone
 *  number on file for the booking instead (see ReservationService.verifyGuestPhone). */
@RestController @RequiredArgsConstructor
public class ContactlessCheckinController {

    private final ReservationService reservationService;

    @GetMapping("/api/v1/pms/public/reservations/{id}/summary")
    public ResponseEntity<ApiResponse<Reservation>> summary(
            @PathVariable UUID id, @RequestParam String phone) {
        return ResponseEntity.ok(ApiResponse.ok(reservationService.getForGuest(id, phone)));
    }

    @PostMapping("/api/v1/pms/public/reservations/{id}/contactless-checkin")
    public ResponseEntity<ApiResponse<Reservation>> checkIn(
            @PathVariable UUID id, @RequestBody ContactlessCheckInRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Pre-check-in complete", reservationService.preCheckIn(
            id, req.getPhone(), req.getIdProofType(), req.getIdProofNumber(), req.getAddress(), req.getSignatureData())));
    }
}
