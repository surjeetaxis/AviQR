package in.aviqr.menu.repository;

import in.aviqr.menu.entity.StockItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StockItemRepository extends JpaRepository<StockItem, UUID> {
    Optional<StockItem> findByMenuItemId(UUID menuItemId);
    List<StockItem> findByShopId(String shopId);

    @Query("SELECT s FROM StockItem s WHERE s.shopId = :shopId AND s.trackStock = true AND s.stockQty <= 0")
    List<StockItem> findOutOfStockByShop(@Param("shopId") String shopId);

    @Query("SELECT s FROM StockItem s WHERE s.shopId = :shopId AND s.trackStock = true AND s.stockQty > 0 AND s.stockQty <= s.lowStockThreshold")
    List<StockItem> findLowStockByShop(@Param("shopId") String shopId);

    @Modifying
    @Query("UPDATE StockItem s SET s.stockQty = s.stockQty - :qty WHERE s.menuItemId = :itemId AND s.trackStock = true AND s.stockQty >= :qty")
    int decrementStock(@Param("itemId") UUID itemId, @Param("qty") int qty);
}
