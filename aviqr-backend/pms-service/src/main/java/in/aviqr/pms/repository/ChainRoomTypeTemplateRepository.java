package in.aviqr.pms.repository;

import in.aviqr.pms.entity.ChainRoomTypeTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ChainRoomTypeTemplateRepository extends JpaRepository<ChainRoomTypeTemplate, UUID> {
    List<ChainRoomTypeTemplate> findByChainIdAndActiveTrue(UUID chainId);
}
