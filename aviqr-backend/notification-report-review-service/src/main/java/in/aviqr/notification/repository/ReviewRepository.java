package in.aviqr.notification.repository;

import in.aviqr.notification.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.math.BigDecimal;
import java.util.UUID;

public interface ReviewRepository extends JpaRepository<Review, UUID> {
    Page<Review> findByShopIdOrderByCreatedAtDesc(String shopId, Pageable pageable);
    Page<Review> findByMenuItemIdOrderByCreatedAtDesc(UUID menuItemId, Pageable pageable);
    Page<Review> findByCustomerIdOrderByCreatedAtDesc(String customerId, Pageable pageable);

    @Query("select coalesce(avg(r.rating), 0) from Review r where r.shopId = :shopId")
    BigDecimal averageRatingForShop(String shopId);

    @Query("select count(r) from Review r where r.shopId = :shopId")
    long countForShop(String shopId);

    @Query("select coalesce(avg(r.rating), 0) from Review r where r.menuItemId = :menuItemId")
    BigDecimal averageRatingForMenuItem(UUID menuItemId);

    @Query("select count(r) from Review r where r.menuItemId = :menuItemId")
    long countForMenuItem(UUID menuItemId);
}
