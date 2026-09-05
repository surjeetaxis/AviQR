package in.aviqr.pms.service;

import in.aviqr.pms.client.HotelRoomDto;
import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.entity.RoomReservation;
import in.aviqr.pms.entity.RoomType;
import in.aviqr.pms.repository.RoomReservationRepository;
import in.aviqr.pms.repository.RoomTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor
public class AvailabilityService {

    private final HotelServiceClient hotelServiceClient;
    private final RoomTypeRepository roomTypeRepo;
    private final RoomReservationRepository roomReservationRepo;

    /** Physical rooms of this type in hotel-service that aren't already held by an
     *  overlapping BOOKED/CHECKED_IN reservation for the given date range. */
    public List<HotelRoomDto> availableRooms(UUID hotelId, UUID roomTypeId, LocalDate checkIn, LocalDate checkOut) {
        RoomType roomType = roomTypeRepo.findById(roomTypeId)
            .orElseThrow(() -> new RuntimeException("Room type not found: " + roomTypeId));

        // MAINTENANCE always excludes a room from inventory (out of service until someone
        // marks it back, not a forecastable state). VACANT/OCCUPIED and housekeeping DIRTY
        // are both point-in-time snapshots, not forecasts — a room occupied by today's
        // guest is free again well before a check-in weeks out, and one that's DIRTY right
        // now will be cleaned before then too. So both only gate *today's* arrivals
        // (walk-ins / immediate check-in); for any future date, only an actual overlapping
        // pms_room_reservations row (checked below) should exclude a room.
        boolean immediateArrival = checkIn.isEqual(LocalDate.now());
        List<HotelRoomDto> allRooms = hotelServiceClient.getRooms(hotelId).stream()
            .filter(r -> roomType.getName().equalsIgnoreCase(r.getRoomType()))
            .filter(r -> !"MAINTENANCE".equals(r.getStatus()))
            .filter(r -> !immediateArrival || ("VACANT".equals(r.getStatus()) && !"DIRTY".equals(r.getHousekeepingStatus())))
            .toList();

        Set<UUID> heldRoomIds = roomReservationRepo.findOverlapping(roomTypeId, checkIn, checkOut).stream()
            .map(RoomReservation::getRoomId)
            .filter(java.util.Objects::nonNull)
            .collect(Collectors.toSet());

        return allRooms.stream().filter(r -> !heldRoomIds.contains(r.getId())).toList();
    }

    public int availableCount(UUID hotelId, UUID roomTypeId, LocalDate checkIn, LocalDate checkOut) {
        return availableRooms(hotelId, roomTypeId, checkIn, checkOut).size();
    }
}
