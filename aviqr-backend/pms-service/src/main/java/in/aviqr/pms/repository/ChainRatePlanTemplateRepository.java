package in.aviqr.pms.repository;

import in.aviqr.pms.entity.ChainRatePlanTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ChainRatePlanTemplateRepository extends JpaRepository<ChainRatePlanTemplate, UUID> {
    List<ChainRatePlanTemplate> findByChainIdAndActiveTrue(UUID chainId);
    List<ChainRatePlanTemplate> findByRoomTypeTemplateIdAndActiveTrue(UUID roomTypeTemplateId);
}
