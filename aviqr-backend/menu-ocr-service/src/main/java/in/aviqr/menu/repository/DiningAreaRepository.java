package in.aviqr.menu.repository;

import in.aviqr.menu.entity.DiningArea;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DiningAreaRepository extends JpaRepository<DiningArea, UUID> {
    List<DiningArea> findByShopIdOrderBySortOrderAsc(String shopId);
}
