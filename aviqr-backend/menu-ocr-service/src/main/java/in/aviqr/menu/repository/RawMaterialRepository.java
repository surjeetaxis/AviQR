package in.aviqr.menu.repository;
import in.aviqr.menu.entity.RawMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.UUID;
public interface RawMaterialRepository extends JpaRepository<RawMaterial, UUID> {
    List<RawMaterial> findByShopIdAndActiveTrueOrderByNameAsc(String shopId);
    @Query("SELECT r FROM RawMaterial r WHERE r.shopId = :shopId AND r.currentStock <= r.minStockLevel AND r.active = true")
    List<RawMaterial> findLowStock(String shopId);
}
