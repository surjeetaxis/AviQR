package in.aviqr.order.repository;
import in.aviqr.order.entity.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.*;

public interface OrderRepository extends JpaRepository<Order, UUID> {
    Page<Order> findByShopIdOrderByCreatedAtDesc(String shopId, Pageable pageable);
    Page<Order> findByShopIdAndStatusOrderByCreatedAtDesc(String shopId, OrderStatus status, Pageable pageable);
    List<Order> findByShopIdAndStatusIn(String shopId, List<OrderStatus> statuses);
    Optional<Order> findByOrderNumber(String orderNumber);
    Page<Order> findByCustomerIdOrderByCreatedAtDesc(String customerId, Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.shopId=:shopId AND o.createdAt BETWEEN :from AND :to")
    List<Order> findByShopIdAndDateRange(@Param("shopId") String shopId,
                                          @Param("from") LocalDateTime from,
                                          @Param("to") LocalDateTime to);

    @Query("SELECT SUM(o.totalAmount) FROM Order o WHERE o.shopId=:shopId AND o.status='COMPLETED' AND o.createdAt BETWEEN :from AND :to")
    java.math.BigDecimal sumRevenueByShopAndDateRange(@Param("shopId") String shopId,
                                                        @Param("from") LocalDateTime from,
                                                        @Param("to") LocalDateTime to);
    long countByShopId(String shopId);
    long countByShopIdAndStatus(String shopId, OrderStatus status);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.shopId=:shopId AND o.status='COMPLETED'")
    java.math.BigDecimal sumRevenueByShop(@Param("shopId") String shopId);
}