package in.aviqr.order.repository;

import in.aviqr.order.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.UUID;

public interface OrderItemRepository extends JpaRepository<OrderItem, UUID> {
    @Query("SELECT COUNT(oi) FROM OrderItem oi WHERE oi.menuItemId=:menuItemId")
    long countOrdersForMenuItem(@Param("menuItemId") UUID menuItemId);

    @Query("SELECT COALESCE(SUM(oi.quantity), 0) FROM OrderItem oi WHERE oi.menuItemId=:menuItemId")
    long sumQuantityForMenuItem(@Param("menuItemId") UUID menuItemId);
}
