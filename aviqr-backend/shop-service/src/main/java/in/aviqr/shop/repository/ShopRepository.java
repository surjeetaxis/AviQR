package in.aviqr.shop.repository;
import in.aviqr.shop.entity.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.*;

public interface ShopRepository extends JpaRepository<Shop, UUID> {
    List<Shop> findByOwnerId(String ownerId);
    Page<Shop> findByStatus(ShopStatus status, Pageable pageable);
    @Query("SELECT s FROM Shop s WHERE LOWER(s.name) LIKE LOWER(CONCAT('%',:q,'%')) OR LOWER(s.city) LIKE LOWER(CONCAT('%',:q,'%'))")
    Page<Shop> search(String q, Pageable pageable);
    long countByStatus(ShopStatus status);

    // Seller Tier System — higher tiers surface first in marketplace listings
    @Query("SELECT s FROM Shop s ORDER BY CASE s.tier WHEN 'GOLD' THEN 0 WHEN 'SILVER' THEN 1 WHEN 'BRONZE' THEN 2 ELSE 3 END, s.rating DESC")
    Page<Shop> findAllOrderByTier(Pageable pageable);

    @Query("SELECT s FROM Shop s WHERE LOWER(s.name) LIKE LOWER(CONCAT('%',:q,'%')) OR LOWER(s.city) LIKE LOWER(CONCAT('%',:q,'%')) " +
           "ORDER BY CASE s.tier WHEN 'GOLD' THEN 0 WHEN 'SILVER' THEN 1 WHEN 'BRONZE' THEN 2 ELSE 3 END, s.rating DESC")
    Page<Shop> searchOrderByTier(String q, Pageable pageable);
}