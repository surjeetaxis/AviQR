package in.aviqr.pms.service;

import in.aviqr.pms.client.HotelRoomDto;
import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.entity.*;
import in.aviqr.pms.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

/** Front-desk work on an existing reservation: finding it from a voucher reference,
 *  phone or name, and assigning or changing the physical room for a stay line. */
@Service @RequiredArgsConstructor @Slf4j
public class FrontDeskService {
    private final ReservationRepository reservationRepo;
    private final RoomReservationRepository roomReservationRepo;
    private final RoomTypeRepository roomTypeRepo;
    private final HotelServiceClient hotelServiceClient;
    private final FolioService folioService;

    public record RoomOption(UUID roomId, String roomNumber, String roomType, String floor, String side, String view,
                             String status, boolean available, boolean current) { }

    /** Reservations matching a booking reference (8 hex), phone digits, or part of the guest name. */
    public List<Reservation> lookup(UUID hotelId, String query) {
        String q = query == null ? "" : query.trim();
        if (q.length() < 3) return List.of();
        String lower = q.toLowerCase(Locale.ROOT);
        if (lower.matches("[0-9a-f]{8}"))
            return reservationRepo.findByReferencePrefix(lower).stream().filter(r -> hotelId.equals(r.getHotelId())).toList();
        String digits = q.replaceAll("\\D", "");
        return reservationRepo.findByHotelIdOrderByCreatedAtDesc(hotelId).stream()
            .filter(r -> digits.length() >= 6 ? BookingVoucherService.lastDigits(r.getGuestPhone()).endsWith(digits.length() > 10 ? digits.substring(digits.length() - 10) : digits)
                : r.getGuestName() != null && r.getGuestName().toLowerCase(Locale.ROOT).contains(lower))
            .limit(20).toList();
    }

    /** Every room in the hotel, marked free or busy for the rest of this stay. */
    public List<RoomOption> roomOptions(UUID reservationId, UUID lineId) {
        Reservation r = reservation(reservationId);
        RoomReservation line = line(reservationId, lineId);
        LocalDate from = remainingFrom(r);
        return hotelServiceClient.getRooms(r.getHotelId()).stream()
            .sorted(Comparator.comparing((HotelRoomDto x) -> String.valueOf(x.getFloor())).thenComparing(x -> String.valueOf(x.getRoomNumber())))
            .map(room -> {
                boolean current = room.getId().equals(line.getRoomId());
                boolean free = current || (!"MAINTENANCE".equals(room.getStatus())
                    && roomReservationRepo.findConflictingForExtension(room.getId(), reservationId, from, r.getCheckOutDate()).isEmpty());
                return new RoomOption(room.getId(), room.getRoomNumber(), room.getRoomType(), room.getFloor(), room.getRoomSide(),
                    room.getViewType(), room.getStatus(), free, current);
            }).toList();
    }

    /** Assigns a room to a stay line or moves it to another free room. A different room
     *  type keeps the booked rate unless a new nightly rate is given; after check-in the
     *  difference for the remaining nights is posted to the folio. */
    @Transactional
    public RoomReservation moveRoom(UUID reservationId, UUID lineId, UUID targetRoomId, BigDecimal newRatePerNight, String movedBy) {
        Reservation r = reservation(reservationId);
        if (r.getStatus() != ReservationStatus.BOOKED && r.getStatus() != ReservationStatus.CHECKED_IN)
            throw new IllegalArgumentException("Only booked or checked-in reservations can change rooms");
        RoomReservation line = line(reservationId, lineId);
        if (targetRoomId.equals(line.getRoomId())) throw new IllegalArgumentException("The guest is already in that room");
        HotelRoomDto target = hotelServiceClient.getRooms(r.getHotelId()).stream().filter(x -> x.getId().equals(targetRoomId)).findFirst()
            .orElseThrow(() -> new IllegalArgumentException("That room isn't in this hotel"));
        if ("MAINTENANCE".equals(target.getStatus())) throw new IllegalArgumentException("Room " + target.getRoomNumber() + " is under maintenance");
        LocalDate from = remainingFrom(r);
        if (!roomReservationRepo.findConflictingForExtension(targetRoomId, reservationId, from, r.getCheckOutDate()).isEmpty())
            throw new IllegalArgumentException("Room " + target.getRoomNumber() + " is booked for some of these nights");
        if (newRatePerNight != null && newRatePerNight.signum() < 0) throw new IllegalArgumentException("The rate can't be negative");
        RoomType type = roomTypeRepo.findByHotelIdAndActiveTrue(r.getHotelId()).stream()
            .filter(t -> t.getName().equalsIgnoreCase(String.valueOf(target.getRoomType()))).findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Room " + target.getRoomNumber() + " has no matching room type in the PMS"));

        UUID previousRoom = line.getRoomId();
        String previousNumber = line.getRoomNumber();
        BigDecimal oldRate = line.getRatePerNight() == null ? BigDecimal.ZERO : line.getRatePerNight();
        line.setRoomId(targetRoomId);
        line.setRoomNumber(target.getRoomNumber());
        if (!type.getId().equals(line.getRoomTypeId())) {
            line.setRoomTypeId(type.getId());
            line.setRatePlanId(null); // the old plan belongs to the old room type; the rate itself is kept
        }
        if (newRatePerNight != null) line.setRatePerNight(newRatePerNight);
        roomReservationRepo.save(line);

        if (r.getStatus() == ReservationStatus.CHECKED_IN) {
            if (previousRoom != null) hotelServiceClient.updateRoomOccupancy(previousRoom, null, null, null, "VACANT");
            hotelServiceClient.updateRoomOccupancy(targetRoomId, r.getGuestName(), r.getCheckInDate().toString(), r.getCheckOutDate().toString(), "OCCUPIED");
            long remaining = ChronoUnit.DAYS.between(from, r.getCheckOutDate());
            BigDecimal diff = line.getRatePerNight().subtract(oldRate).multiply(BigDecimal.valueOf(remaining));
            if (diff.signum() != 0 && remaining > 0)
                folioService.addCharge(reservationId, line.getId(), FolioChargeType.ROOM,
                    "Room change " + label(previousNumber) + " → " + target.getRoomNumber() + " (" + remaining + " night(s))", diff);
        }
        String audit = (previousRoom == null ? "Assigned room " : "Moved " + label(previousNumber) + " → ") + target.getRoomNumber()
            + " by " + (movedBy == null || movedBy.isBlank() ? "staff" : movedBy.substring(0, Math.min(8, movedBy.length())));
        String notes = r.getNotes() == null || r.getNotes().isBlank() ? audit : r.getNotes() + "\n" + audit;
        if (notes.length() <= 255) { // pms_reservations.notes is varchar(255)
            r.setNotes(notes);
            reservationRepo.save(r);
        }
        log.info("Reservation {}: {}", reservationId, audit);
        return line;
    }

    private Reservation reservation(UUID id) {
        return reservationRepo.findById(id).orElseThrow(() -> new IllegalArgumentException("Reservation not found"));
    }

    private RoomReservation line(UUID reservationId, UUID lineId) {
        return roomReservationRepo.findByReservationId(reservationId).stream().filter(l -> l.getId().equals(lineId)).findFirst()
            .orElseThrow(() -> new IllegalArgumentException("That room isn't part of this reservation"));
    }

    /** A move only affects the nights not yet slept. */
    private static LocalDate remainingFrom(Reservation r) {
        LocalDate today = LocalDate.now();
        return today.isAfter(r.getCheckInDate()) ? today : r.getCheckInDate();
    }

    private static String label(String roomNumber) { return roomNumber == null ? "unassigned" : roomNumber; }
}
