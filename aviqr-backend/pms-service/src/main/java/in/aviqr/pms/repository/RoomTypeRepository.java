package in.aviqr.pms.repository;

import in.aviqr.pms.entity.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface RoomTypeRepository extends JpaRepository<RoomType, UUID> {
    List<RoomType> findByHotelId(UUID hotelId);
    List<RoomType> findByHotelIdAndActiveTrue(UUID hotelId);
}
