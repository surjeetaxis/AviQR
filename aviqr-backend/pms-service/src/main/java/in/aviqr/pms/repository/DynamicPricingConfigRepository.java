package in.aviqr.pms.repository;

import in.aviqr.pms.entity.DynamicPricingConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface DynamicPricingConfigRepository extends JpaRepository<DynamicPricingConfig, UUID> {
    Optional<DynamicPricingConfig> findByHotelId(UUID hotelId);
}
