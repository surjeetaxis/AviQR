package in.aviqr.pms.repository;

import in.aviqr.pms.entity.RoomReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface RoomReservationRepository extends JpaRepository<RoomReservation, UUID> {
    List<RoomReservation> findByReservationId(UUID reservationId);

    // Overlap = existing.checkIn < newCheckOut AND existing.checkOut > newCheckIn.
    // Cancelled/no-show reservations never hold inventory.
    @Query("""
        select rr from RoomReservation rr
        join Reservation r on r.id = rr.reservationId
        where rr.roomTypeId = :roomTypeId
          and r.status in ('BOOKED', 'CHECKED_IN')
          and r.checkInDate < :checkOutDate
          and r.checkOutDate > :checkInDate
        """)
    List<RoomReservation> findOverlapping(@Param("roomTypeId") UUID roomTypeId,
                                           @Param("checkInDate") LocalDate checkInDate,
                                           @Param("checkOutDate") LocalDate checkOutDate);

    // The room-stay(s) currently in progress for a physical room (set at check-in,
    // cleared at check-out) — used to attribute a POS/room-charge order to a folio.
    // Ordered most-recent-check-in-first: normally there's exactly one, but nothing
    // in the check-in flow enforces that a room can't end up with more than one
    // CHECKED_IN reservation open against it (e.g. a guest checked in without the
    // prior occupant being checked out first) — callers should take the first
    // result rather than assume uniqueness, so that case degrades to "attribute the
    // charge to whoever checked in most recently" instead of throwing.
    @Query("""
        select rr from RoomReservation rr
        join Reservation r on r.id = rr.reservationId
        where rr.roomId = :roomId
          and r.status = 'CHECKED_IN'
          and rr.actualCheckInAt is not null
          and rr.actualCheckOutAt is null
        order by rr.actualCheckInAt desc
        """)
    List<RoomReservation> findActiveStaysByRoomId(@Param("roomId") UUID roomId);

    // Rooms actually occupied on a given night, for the night-audit report — only a
    // real stay counts (CHECKED_IN or already CHECKED_OUT), not a future BOOKED
    // reservation or a NO_SHOW/CANCELLED one that never held the room that night.
    @Query("""
        select rr from RoomReservation rr
        join Reservation r on r.id = rr.reservationId
        where r.hotelId = :hotelId
          and r.status in ('CHECKED_IN', 'CHECKED_OUT')
          and r.checkInDate <= :date
          and r.checkOutDate > :date
        """)
    List<RoomReservation> findOccupiedOnDate(@Param("hotelId") UUID hotelId, @Param("date") LocalDate date);

    // Extending a stay needs the SPECIFIC physical room free for the added nights, not
    // just any room of that type — a different guest's booking on that exact room
    // during the extension window must block it, even if other rooms of the same type
    // are open. Only the extension portion [oldCheckOutDate, newCheckOutDate) is
    // checked, since the room is already known to be held for the original dates.
    @Query("""
        select rr from RoomReservation rr
        join Reservation r on r.id = rr.reservationId
        where rr.roomId = :roomId
          and rr.reservationId <> :excludeReservationId
          and r.status in ('BOOKED', 'CHECKED_IN')
          and r.checkInDate < :newCheckOutDate
          and r.checkOutDate > :oldCheckOutDate
        """)
    List<RoomReservation> findConflictingForExtension(@Param("roomId") UUID roomId,
                                                        @Param("excludeReservationId") UUID excludeReservationId,
                                                        @Param("oldCheckOutDate") LocalDate oldCheckOutDate,
                                                        @Param("newCheckOutDate") LocalDate newCheckOutDate);
}
