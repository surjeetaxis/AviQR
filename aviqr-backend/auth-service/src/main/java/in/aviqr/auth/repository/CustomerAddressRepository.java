package in.aviqr.auth.repository;

import in.aviqr.auth.entity.CustomerAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CustomerAddressRepository extends JpaRepository<CustomerAddress, UUID> {
    List<CustomerAddress> findByUserIdOrderByIsDefaultDescCreatedAtDesc(UUID userId);

    // Haversine distance in km, restricted to each user's default address (one
    // row per user) so a shop's marketing radius doesn't double-count a
    // customer who saved several addresses. Same query shape as shop-mall-service's
    // ShopRepository#findNearby — wrapped in a subquery because the computed
    // distance_km column can't be filtered with WHERE in the same SELECT it's
    // defined in.
    @Query(value = """
        SELECT * FROM (
          SELECT ca.user_id AS user_id, u.name AS name, u.email AS email, u.phone AS phone,
            ( 6371 * acos( cos(radians(:lat)) * cos(radians(ca.latitude))
              * cos(radians(ca.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(ca.latitude)) ) ) AS distance_km
          FROM customer_addresses ca
          JOIN users u ON u.id = ca.user_id
          WHERE ca.latitude IS NOT NULL AND ca.longitude IS NOT NULL AND ca.is_default = true
        ) sub
        WHERE distance_km <= :radiusKm
        ORDER BY distance_km ASC
        """, nativeQuery = true)
    List<Object[]> findNearby(@Param("lat") double lat, @Param("lng") double lng, @Param("radiusKm") double radiusKm);
}