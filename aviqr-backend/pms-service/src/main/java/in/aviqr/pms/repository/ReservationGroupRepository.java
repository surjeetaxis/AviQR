package in.aviqr.pms.repository;

import in.aviqr.pms.entity.ReservationGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ReservationGroupRepository extends JpaRepository<ReservationGroup, UUID> {
    List<ReservationGroup> findByHotelIdOrderByCreatedAtDesc(UUID hotelId);
}
