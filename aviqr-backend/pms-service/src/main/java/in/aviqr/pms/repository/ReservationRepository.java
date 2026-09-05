package in.aviqr.pms.repository;

import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.entity.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ReservationRepository extends JpaRepository<Reservation, UUID> {
    List<Reservation> findByHotelIdOrderByCreatedAtDesc(UUID hotelId);
    List<Reservation> findByHotelIdAndStatusOrderByCheckInDate(UUID hotelId, ReservationStatus status);
    List<Reservation> findByHotelIdAndCheckInDateAndStatus(UUID hotelId, LocalDate checkInDate, ReservationStatus status);
    List<Reservation> findByHotelIdAndCheckOutDateAndStatus(UUID hotelId, LocalDate checkOutDate, ReservationStatus status);
    List<Reservation> findByGroupIdOrderByCreatedAtAsc(UUID groupId);
    List<Reservation> findByGuestIdOrderByCheckInDateDesc(UUID guestId);
    // Night audit needs every reservation due that day regardless of outcome, so it
    // can tell arrivals from no-shows/cancellations itself — see NightAuditService.
    List<Reservation> findByHotelIdAndCheckInDate(UUID hotelId, LocalDate checkInDate);
    List<Reservation> findByHotelIdAndCheckOutDate(UUID hotelId, LocalDate checkOutDate);

    // Cross-hotel — used by ReservationLifecycleScheduler's daily jobs, which run
    // once for the whole platform rather than being triggered per hotel.
    List<Reservation> findByStatusAndCheckInDateBefore(ReservationStatus status, LocalDate checkInDate);
    List<Reservation> findByStatusAndCheckOutDate(ReservationStatus status, LocalDate checkOutDate);
}
