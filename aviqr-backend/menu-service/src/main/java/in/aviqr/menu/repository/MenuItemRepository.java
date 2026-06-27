package in.aviqr.menu.repository;
import in.aviqr.menu.entity.MenuItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.UUID;

public interface MenuItemRepository extends JpaRepository<MenuItem, UUID> {
    List<MenuItem> findByCategoryIdAndAvailableTrue(UUID categoryId);
    List<MenuItem> findByShopIdOrderBySortOrder(String shopId);
    List<MenuItem> findByShopIdAndAvailableTrue(String shopId);
    @Query("SELECT m FROM MenuItem m WHERE m.shopId=:shopId AND (LOWER(m.name) LIKE LOWER(CONCAT('%',:q,'%')))")
    List<MenuItem> search(String shopId, String q);
    long countByShopId(String shopId);

    // Product Ranking — paginated product listing for shop owners/admins
    Page<MenuItem> findByShopId(String shopId, Pageable pageable);

    @Query("SELECT m FROM MenuItem m WHERE m.shopId=:shopId AND LOWER(m.name) LIKE LOWER(CONCAT('%',:q,'%'))")
    Page<MenuItem> searchByShopId(String shopId, String q, Pageable pageable);
}