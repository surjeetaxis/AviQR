package in.aviqr.pms.repository;

import in.aviqr.pms.entity.Deal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DealRepository extends JpaRepository<Deal, UUID> {
    List<Deal> findByHotelIdOrderByCreatedAtDesc(UUID hotelId);
    List<Deal> findByHotelIdAndActiveTrue(UUID hotelId);
}
