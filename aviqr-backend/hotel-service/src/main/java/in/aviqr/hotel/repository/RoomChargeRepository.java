package in.aviqr.hotel.repository;
import in.aviqr.hotel.entity.RoomCharge;
import in.aviqr.hotel.entity.RoomChargeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface RoomChargeRepository extends JpaRepository<RoomCharge, UUID> {
    List<RoomCharge> findByHotelIdAndRoomNumberOrderByCreatedAtDesc(UUID hotelId, String roomNumber);
    List<RoomCharge> findByHotelIdAndRoomNumberAndStatus(UUID hotelId, String roomNumber, RoomChargeStatus status);
}
