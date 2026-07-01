package in.aviqr.hotel.repository;
import in.aviqr.hotel.entity.OutletBooking;
import in.aviqr.hotel.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface OutletBookingRepository extends JpaRepository<OutletBooking, UUID> {
    List<OutletBooking> findByHotelIdOrderByCreatedAtDesc(UUID hotelId);
    List<OutletBooking> findByHotelIdAndStatusOrderByCreatedAtDesc(UUID hotelId, BookingStatus status);
    List<OutletBooking> findByOutletIdAndBookingDateOrderByBookingTimeAsc(UUID outletId, String bookingDate);
    List<OutletBooking> findByHotelIdAndRoomNumberOrderByCreatedAtDesc(UUID hotelId, String roomNumber);
}
