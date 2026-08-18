package in.aviqr.shop.repository;
import in.aviqr.shop.entity.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface ShopRepository extends JpaRepository<Shop, UUID> {
    List<Shop> findByOwnerId(String ownerId);
    Page<Shop> findByStatus(ShopStatus status, Pageable pageable);
    @Query("SELECT s FROM Shop s WHERE LOWER(s.name) LIKE LOWER(CONCAT('%',:q,'%')) OR LOWER(s.city) LIKE LOWER(CONCAT('%',:q,'%'))")
    Page<Shop> search(String q, Pageable pageable);
    long countByStatus(ShopStatus status);
    List<Shop> findBySubscriptionStatusAndTrialEndsAtBefore(SubscriptionStatus status, java.time.LocalDateTime cutoff);
    Optional<Shop> findByReferralCode(String referralCode);
    boolean existsByReferralCode(String referralCode);
    List<Shop> findByReferredByCode(String referredByCode);

    // Cheap projection for sitemap generation — avoids loading full Shop
    // entities (and the EAGER shop_opening_hours collection) for what's
    // ultimately just an id + a timestamp per row.
    @Query("SELECT s.id AS id, s.updatedAt AS updatedAt FROM Shop s WHERE s.status = 'ACTIVE'")
    List<ShopSitemapRow> findActiveForSitemap();

    interface ShopSitemapRow {
        UUID getId();
        java.time.LocalDateTime getUpdatedAt();
    }

    // Haversine distance in km. Wrapped in a subquery because the computed
    // distance_km column can't be filtered with WHERE in the same SELECT it's
    // defined in, and HAVING without GROUP BY would collapse to one row.
    // Explicit column list (not SELECT *) so Object[] index order is stable
    // and doesn't depend on the table's physical column order.
    @Query(value = """
        SELECT * FROM (
          SELECT id, name, tagline, city, logo_url, rating, rating_count, latitude, longitude,
            ( 6371 * acos( cos(radians(:lat)) * cos(radians(latitude))
              * cos(radians(longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(latitude)) ) ) AS distance_km
          FROM shops WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND status = 'ACTIVE'
        ) sub
        WHERE distance_km <= :radiusKm
        ORDER BY distance_km ASC
        """, nativeQuery = true)
    List<Object[]> findNearby(@Param("lat") double lat, @Param("lng") double lng, @Param("radiusKm") double radiusKm);
}