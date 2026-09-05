package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.dto.BookingCalendarResponse;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.entity.RoomReservation;
import in.aviqr.pms.repository.ReservationRepository;
import in.aviqr.pms.repository.RoomReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/** Tape-chart / booking-board: physical rooms as rows, each stay a bar spanning its
 *  dates — the grid view the flat Reservations/Front Desk lists don't provide (see
 *  original PMS plan's BookingBoard.jsx, never actually built until now). */
@RestController @RequiredArgsConstructor
public class BookingCalendarController {

    private final HotelServiceClient hotelServiceClient;
    private final RoomReservationRepository roomReservationRepo;
    private final ReservationRepository reservationRepo;

    @GetMapping("/api/v1/pms/hotels/{hotelId}/booking-calendar")
    public ResponseEntity<ApiResponse<BookingCalendarResponse>> get(
            @PathVariable UUID hotelId,
            @RequestParam String from, @RequestParam String to,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));

        LocalDate fromDate = LocalDate.parse(from), toDate = LocalDate.parse(to);

        // Every room is shown as a row, MAINTENANCE included, so staff can see why a
        // room has no bookable bars rather than it silently missing from the chart.
        List<BookingCalendarResponse.RoomRow> rooms = hotelServiceClient.getRooms(hotelId).stream()
            .map(r -> new BookingCalendarResponse.RoomRow(r.getId(), r.getRoomNumber(), r.getRoomType()))
            .sorted((a, b) -> a.getRoomNumber().compareToIgnoreCase(b.getRoomNumber()))
            .toList();

        List<RoomReservation> roomReservations = roomReservationRepo.findForBookingCalendar(hotelId, fromDate, toDate);
        Map<UUID, Reservation> reservationsById = reservationRepo
            .findAllById(roomReservations.stream().map(RoomReservation::getReservationId).distinct().toList())
            .stream().collect(Collectors.toMap(Reservation::getId, r -> r));

        List<BookingCalendarResponse.StayBar> stays = roomReservations.stream()
            .map(rr -> {
                Reservation res = reservationsById.get(rr.getReservationId());
                if (res == null) return null;
                return new BookingCalendarResponse.StayBar(
                    res.getId(), rr.getRoomId(), res.getGuestName(), res.getStatus().name(),
                    res.getCheckInDate(), res.getCheckOutDate());
            })
            .filter(java.util.Objects::nonNull)
            .toList();

        return ResponseEntity.ok(ApiResponse.ok(new BookingCalendarResponse(rooms, stays)));
    }
}
