package in.aviqr.pms.repository;

import in.aviqr.pms.entity.LoyaltyProgramConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface LoyaltyProgramConfigRepository extends JpaRepository<LoyaltyProgramConfig, UUID> {
    Optional<LoyaltyProgramConfig> findByHotelId(UUID hotelId);
}
