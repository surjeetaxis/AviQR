package in.aviqr.menu.repository;

import in.aviqr.menu.entity.AreaMenuPrice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AreaMenuPriceRepository extends JpaRepository<AreaMenuPrice, UUID> {
    List<AreaMenuPrice> findByAreaId(UUID areaId);
    void deleteByAreaId(UUID areaId);
}
