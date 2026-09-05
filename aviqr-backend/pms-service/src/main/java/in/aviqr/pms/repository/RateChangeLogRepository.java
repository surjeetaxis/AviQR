package in.aviqr.pms.repository;

import in.aviqr.pms.entity.RateChangeLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface RateChangeLogRepository extends JpaRepository<RateChangeLog, UUID> {
    Page<RateChangeLog> findByHotelIdOrderByChangedAtDesc(UUID hotelId, Pageable pageable);
    Page<RateChangeLog> findByHotelIdAndRoomTypeIdOrderByChangedAtDesc(UUID hotelId, UUID roomTypeId, Pageable pageable);
}
