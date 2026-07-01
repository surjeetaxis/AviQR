package in.aviqr.hotel.repository;
import in.aviqr.hotel.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface RoomRepository extends JpaRepository<Room,UUID> {
    List<Room> findByHotelId(UUID hotelId);
    long countByHotelIdAndStatus(UUID hotelId, RoomStatus s);
    Optional<Room> findByHotelIdAndRoomNumber(UUID hotelId, String roomNumber);
}
