package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.entity.RegistrationCard;
import in.aviqr.pms.service.RegistrationCardService;
import in.aviqr.pms.service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Staff view of the signed digital registration card — auth required, unlike the
 *  guest-facing capture flow in ContactlessCheckinController. */
@RestController @RequiredArgsConstructor
public class RegistrationCardController {

    private final RegistrationCardService registrationCardService;
    private final ReservationService reservationService;
    private final HotelServiceClient hotelServiceClient;

    @GetMapping("/api/v1/pms/reservations/{id}/registration-card")
    public ResponseEntity<ApiResponse<RegistrationCard>> get(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Reservation reservation = reservationService.get(id);
        if (!hotelServiceClient.hasAccess(reservation.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(registrationCardService.get(id)));
    }
}
