package in.aviqr.pms.repository;

import in.aviqr.pms.entity.RatePlan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RatePlanRepository extends JpaRepository<RatePlan, UUID> {
    List<RatePlan> findByHotelId(UUID hotelId);
    List<RatePlan> findByRoomTypeIdAndActiveTrue(UUID roomTypeId);
    // Used by ChainTemplateService to push a chain-level template idempotently.
    Optional<RatePlan> findByRoomTypeIdAndName(UUID roomTypeId, String name);
}
