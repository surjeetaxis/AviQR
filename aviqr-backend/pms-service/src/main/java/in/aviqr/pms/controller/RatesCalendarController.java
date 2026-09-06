package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelRoomDto;
import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.dto.RatesCalendarResponse;
import in.aviqr.pms.entity.DayPrice;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.entity.RatePlan;
import in.aviqr.pms.entity.RoomReservation;
import in.aviqr.pms.entity.RoomType;
import in.aviqr.pms.repository.DayPriceRepository;
import in.aviqr.pms.repository.RatePlanRepository;
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

/** Combined inventory + rates calendar: one grid covering allotment/booked/available
 *  per room type and price/restrictions per rate plan, for an arbitrary date window —
 *  the operational view a revenue manager actually works from, instead of switching
 *  between the Room Types & Rates date manager, the Rate & Inventory Log, and the
 *  booking calendar's availability row separately. No fixed lookback/lookahead limit:
 *  `from`/`to` can span years in either direction, same as every other date-ranged
 *  PMS endpoint — the frontend controls how wide a window it fetches at once. */
@RestController @RequiredArgsConstructor
public class RatesCalendarController {

    private final HotelServiceClient hotelServiceClient;
    private final RoomTypeRepository roomTypeRepo;
    private final RatePlanRepository ratePlanRepo;
    private final DayPriceRepository dayPriceRepo;
    private final RoomReservationRepository roomReservationRepo;
    private final ReservationRepository reservationRepo;
    private final InventoryRollupService inventoryRollupService;

    @GetMapping("/api/v1/pms/hotels/{hotelId}/rates-calendar")
    public ResponseEntity<ApiResponse<RatesCalendarResponse>> get(
            @PathVariable UUID hotelId,
            @RequestParam String from, @RequestParam String to,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));

        LocalDate fromDate = LocalDate.parse(from), toDate = LocalDate.parse(to);
        LocalDate lastDate = toDate.minusDays(1);

        List<RoomType> roomTypes = roomTypeRepo.findByHotelIdAndActiveTrue(hotelId);
        List<HotelRoomDto> hotelRooms = hotelServiceClient.getRooms(hotelId);

        List<RoomReservation> roomReservations = roomReservationRepo.findForBookingCalendar(hotelId, fromDate, toDate);
        Map<UUID, Reservation> reservationsById = reservationRepo
            .findAllById(roomReservations.stream().map(RoomReservation::getReservationId).distinct().toList())
            .stream().collect(Collectors.toMap(Reservation::getId, r -> r));

        Map<UUID, InventoryRollupService.RoomTypeRollup> rollupByType = inventoryRollupService
            .compute(roomTypes, hotelRooms, roomReservations, reservationsById, fromDate, toDate).stream()
            .collect(Collectors.toMap(InventoryRollupService.RoomTypeRollup::roomTypeId, r -> r));

        List<RatesCalendarResponse.RoomTypeCalendar> roomTypeCalendars = roomTypes.stream()
            .map(rt -> {
                InventoryRollupService.RoomTypeRollup roll = rollupByType.get(rt.getId());
                List<RatesCalendarResponse.InventoryDay> byDate = roll == null ? List.of() : roll.byDate().stream()
                    .map(d -> new RatesCalendarResponse.InventoryDay(d.date(), d.allotted(), d.booked(), d.available()))
                    .toList();

                List<RatePlan> ratePlans = ratePlanRepo.findByRoomTypeIdAndActiveTrue(rt.getId());
                List<RatesCalendarResponse.RatePlanCalendar> ratePlanCalendars = ratePlans.stream()
                    .map(rp -> {
                        Map<LocalDate, DayPrice> dayPriceByDate = dayPriceRepo
                            .findByRatePlanIdAndDateBetween(rp.getId(), fromDate, lastDate).stream()
                            .collect(Collectors.toMap(DayPrice::getDate, dp -> dp, (a, b) -> a));
                        List<RatesCalendarResponse.RateDay> rateDays = fromDate.datesUntil(toDate)
                            .map(date -> {
                                DayPrice dp = dayPriceByDate.get(date);
                                boolean overridden = dp != null && dp.getPrice() != null;
                                return new RatesCalendarResponse.RateDay(
                                    date, overridden ? dp.getPrice() : rp.getBaseRate(), overridden,
                                    dp == null ? null : dp.getMinStay(), dp == null ? null : dp.getMaxStay(),
                                    dp != null && Boolean.TRUE.equals(dp.getClosedToArrival()),
                                    dp != null && Boolean.TRUE.equals(dp.getClosedToDeparture()),
                                    dp != null && Boolean.TRUE.equals(dp.getStopSell()));
                            })
                            .toList();
                        return new RatesCalendarResponse.RatePlanCalendar(
                            rp.getId(), rp.getName(), rp.getBaseRate(), rp.getMealPlan().name(), rp.getOccupancy(), rateDays);
                    })
                    .toList();

                return new RatesCalendarResponse.RoomTypeCalendar(
                    rt.getId(), rt.getName(), rt.getMaxOccupancy(),
                    roll == null ? 0 : roll.physicalRoomCount(), byDate, ratePlanCalendars);
            })
            .toList();

        return ResponseEntity.ok(ApiResponse.ok(new RatesCalendarResponse(roomTypeCalendars)));
    }
}
