package in.aviqr.hotel.repository;
import in.aviqr.hotel.entity.HotelAccess;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface HotelAccessRepository extends JpaRepository<HotelAccess, UUID> {
    List<HotelAccess> findByHotelId(UUID hotelId);
    List<HotelAccess> findByUserId(String userId);
    boolean existsByHotelIdAndUserId(UUID hotelId, String userId);
    Optional<HotelAccess> findByHotelIdAndUserIdAndOutletIdIsNull(UUID hotelId, String userId);
}
