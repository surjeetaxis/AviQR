package in.aviqr.hotel.repository;
import in.aviqr.hotel.entity.*; import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*; public interface RoomRequestRepository extends JpaRepository<RoomRequest,UUID> {
    List<RoomRequest> findByHotelIdOrderByCreatedAtDesc(UUID hotelId);
    List<RoomRequest> findByHotelIdAndStatusInOrderByCreatedAtDesc(UUID hotelId, List<RequestStatus> statuses);
    List<RoomRequest> findByHotelIdAndServiceTypeOrderByCreatedAtDesc(UUID hotelId, String serviceType); }