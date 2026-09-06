package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelRoomDto;
import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.dto.BookingCalendarResponse;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.entity.RoomReservation;
import in.aviqr.pms.entity.RoomType;
import in.aviqr.pms.repository.ReservationRepository;
import in.aviqr.pms.repository.RoomReservationRepository;
import in.aviqr.pms.repository.RoomTypeRepository;
import in.aviqr.pms.service.InventoryRollupService;
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
    private final RoomTypeRepository roomTypeRepo;
    private final InventoryRollupService inventoryRollupService;

    @GetMapping("/api/v1/pms/hotels/{hotelId}/booking-calendar")
    public ResponseEntity<ApiResponse<BookingCalendarResponse>> get(
            @PathVariable UUID hotelId,
            @RequestParam String from, @RequestParam String to,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));

        LocalDate fromDate = LocalDate.parse(from), toDate = LocalDate.parse(to);

        List<RoomType> roomTypes = roomTypeRepo.findByHotelIdAndActiveTrue(hotelId);
        // hotel-service's Room.roomType is a plain string; match it to a pms RoomType
        // by name (case-insensitive) the same way AvailabilityService does.
        Map<String, RoomType> roomTypeByName = roomTypes.stream()
            .collect(Collectors.toMap(rt -> rt.getName().toLowerCase(), rt -> rt, (a, b) -> a));

        List<HotelRoomDto> hotelRooms = hotelServiceClient.getRooms(hotelId);

        // Every room is shown as a row, MAINTENANCE included, so staff can see why a
        // room has no bookable bars rather than it silently missing from the chart.
        List<BookingCalendarResponse.RoomRow> rooms = hotelRooms.stream()
            .map(r -> {
                RoomType rt = roomTypeByName.get(r.getRoomType() == null ? "" : r.getRoomType().toLowerCase());
                return new BookingCalendarResponse.RoomRow(r.getId(), r.getRoomNumber(), r.getRoomType(), rt == null ? null : rt.getId());
            })
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

        List<InventoryRollupService.RoomTypeRollup> rollups =
            inventoryRollupService.compute(roomTypes, hotelRooms, roomReservations, reservationsById, fromDate, toDate);
        List<BookingCalendarResponse.RoomTypeAvailability> availability = rollups.stream()
            .map(roll -> {
                RoomType rt = roomTypes.stream().filter(t -> t.getId().equals(roll.roomTypeId())).findFirst().orElseThrow();
                List<BookingCalendarResponse.DateAvailability> byDate = roll.byDate().stream()
                    .map(d -> new BookingCalendarResponse.DateAvailability(d.date(), d.available()))
                    .toList();
                return new BookingCalendarResponse.RoomTypeAvailability(rt.getId(), rt.getName(), roll.physicalRoomCount(), byDate);
            })
            .toList();

        return ResponseEntity.ok(ApiResponse.ok(new BookingCalendarResponse(rooms, stays, availability)));
    }
}
