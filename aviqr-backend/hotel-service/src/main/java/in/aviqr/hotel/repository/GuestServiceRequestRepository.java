package in.aviqr.hotel.repository;
import in.aviqr.hotel.entity.GuestServiceRequest;
import in.aviqr.hotel.entity.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface GuestServiceRequestRepository extends JpaRepository<GuestServiceRequest, UUID> {
    List<GuestServiceRequest> findByHotelIdOrderByCreatedAtDesc(UUID hotelId);
    List<GuestServiceRequest> findByHotelIdAndStatusOrderByCreatedAtDesc(UUID hotelId, RequestStatus status);
    List<GuestServiceRequest> findByHotelIdAndRoomNumberOrderByCreatedAtDesc(UUID hotelId, String roomNumber);
}
