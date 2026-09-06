package in.aviqr.pms.service;

import in.aviqr.pms.client.HotelRoomDto;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.entity.ReservationStatus;
import in.aviqr.pms.entity.RoomReservation;
import in.aviqr.pms.entity.RoomType;
import in.aviqr.pms.entity.RoomTypeInventory;
import in.aviqr.pms.repository.RoomTypeInventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** Sellable-rooms-per-date for each room type, shared by the booking-calendar's
 *  availability roll-up and the rates-calendar's inventory row: physical
 *  (non-MAINTENANCE) room count minus rooms held that night by a BOOKED/CHECKED_IN
 *  stay, capped by any manager-set RoomTypeInventory allotment for that date — same
 *  rule AvailabilityService.availableRooms() applies for a single stay, just rolled
 *  up per calendar day and split into allotted/booked/available instead of a single
 *  number. */
@Service @RequiredArgsConstructor
public class InventoryRollupService {

    private final RoomTypeInventoryRepository inventoryRepo;

    public record DayInventory(LocalDate date, int allotted, int booked, int available) {}
    public record RoomTypeRollup(UUID roomTypeId, int physicalRoomCount, List<DayInventory> byDate) {}

    public List<RoomTypeRollup> compute(List<RoomType> roomTypes, List<HotelRoomDto> hotelRooms,
            List<RoomReservation> roomReservations, Map<UUID, Reservation> reservationsById,
            LocalDate fromDate, LocalDate toDate) {

        List<LocalDate> dates = new ArrayList<>();
        for (LocalDate d = fromDate; d.isBefore(toDate); d = d.plusDays(1)) dates.add(d);

        Map<UUID, Long> physicalCountByType = hotelRooms.stream()
            .filter(r -> !"MAINTENANCE".equals(r.getStatus()))
            .collect(Collectors.groupingBy(r -> roomTypes.stream()
                    .filter(rt -> rt.getName().equalsIgnoreCase(r.getRoomType()))
                    .map(RoomType::getId).findFirst().orElse(null),
                Collectors.counting()));

        List<RoomReservation> heldReservations = roomReservations.stream()
            .filter(rr -> {
                Reservation res = reservationsById.get(rr.getReservationId());
                return res != null && (res.getStatus() == ReservationStatus.BOOKED || res.getStatus() == ReservationStatus.CHECKED_IN);
            })
            .toList();

        List<RoomTypeRollup> result = new ArrayList<>();
        for (RoomType rt : roomTypes) {
            int physicalCount = physicalCountByType.getOrDefault(rt.getId(), 0L).intValue();
            Map<LocalDate, Integer> allotmentByDate = inventoryRepo
                .findByRoomTypeIdAndDateBetween(rt.getId(), fromDate, toDate.minusDays(1)).stream()
                .collect(Collectors.toMap(RoomTypeInventory::getDate, RoomTypeInventory::getAllotment, (a, b) -> a));

            List<DayInventory> byDate = new ArrayList<>();
            for (LocalDate date : dates) {
                Set<UUID> heldRoomIds = heldReservations.stream()
                    .filter(rr -> rt.getId().equals(rr.getRoomTypeId()))
                    .filter(rr -> {
                        Reservation res = reservationsById.get(rr.getReservationId());
                        return !date.isBefore(res.getCheckInDate()) && date.isBefore(res.getCheckOutDate());
                    })
                    .map(RoomReservation::getRoomId)
                    .filter(java.util.Objects::nonNull)
                    .collect(Collectors.toSet());
                int booked = heldRoomIds.size();
                Integer cap = allotmentByDate.get(date);
                // An allotment can only ever reduce sellable count, never promise rooms
                // beyond the physical count (this service doesn't model overbooking).
                int allotted = cap != null ? Math.min(physicalCount, Math.max(0, cap)) : physicalCount;
                int available = Math.max(0, allotted - booked);
                byDate.add(new DayInventory(date, allotted, booked, available));
            }
            result.add(new RoomTypeRollup(rt.getId(), physicalCount, byDate));
        }
        return result;
    }
}
