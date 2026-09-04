package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.dto.CreateReservationRequest;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.entity.RoomReservation;
import in.aviqr.pms.service.AvailabilityService;
import in.aviqr.pms.service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;
    private final AvailabilityService availabilityService;
    private final HotelServiceClient hotelServiceClient;

    @GetMapping("/api/v1/pms/availability")
    public ResponseEntity<ApiResponse<Map<String, Object>>> availability(
            @RequestParam UUID hotelId, @RequestParam UUID roomTypeId,
            @RequestParam String checkIn, @RequestParam String checkOut) {
        LocalDate in = LocalDate.parse(checkIn), out = LocalDate.parse(checkOut);
        int count = availabilityService.availableCount(hotelId, roomTypeId, in, out);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("availableRooms", count)));
    }

    @PostMapping("/api/v1/pms/reservations")
    public ResponseEntity<ApiResponse<Reservation>> create(
            @RequestBody CreateReservationRequest req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(req.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Reservation created", reservationService.create(req, uid)));
    }

    @GetMapping("/api/v1/pms/reservations/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<Reservation>>> listForHotel(
            @PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(reservationService.forHotel(hotelId)));
    }

    @GetMapping("/api/v1/pms/reservations/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> get(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Reservation reservation = reservationService.get(id);
        if (!hotelServiceClient.hasAccess(reservation.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        List<RoomReservation> rooms = reservationService.rooms(id);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("reservation", reservation, "rooms", rooms)));
    }

    @PostMapping("/api/v1/pms/reservations/{id}/check-in")
    public ResponseEntity<ApiResponse<Reservation>> checkIn(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(reservationService.get(id).getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Checked in", reservationService.checkIn(id)));
    }

    @PostMapping("/api/v1/pms/reservations/{id}/check-out")
    public ResponseEntity<ApiResponse<Reservation>> checkOut(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(reservationService.get(id).getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Checked out", reservationService.checkOut(id)));
    }

    @PostMapping("/api/v1/pms/reservations/{id}/extend")
    public ResponseEntity<ApiResponse<Reservation>> extend(
            @PathVariable UUID id, @RequestParam String newCheckOutDate,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(reservationService.get(id).getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Stay extended", reservationService.extendStay(id, LocalDate.parse(newCheckOutDate))));
    }

    @PostMapping("/api/v1/pms/reservations/{id}/cancel")
    public ResponseEntity<ApiResponse<Reservation>> cancel(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(reservationService.get(id).getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Cancelled", reservationService.cancel(id)));
    }

    @PostMapping("/api/v1/pms/reservations/{id}/no-show")
    public ResponseEntity<ApiResponse<Reservation>> noShow(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(reservationService.get(id).getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Marked no-show", reservationService.noShow(id)));
    }
}
