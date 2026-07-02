package in.aviqr.shop.repository;

import in.aviqr.shop.entity.CustomerFavorite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CustomerFavoriteRepository extends JpaRepository<CustomerFavorite, UUID> {
    Optional<CustomerFavorite> findByCustomerPhoneAndShopId(String customerPhone, String shopId);
    List<CustomerFavorite> findByCustomerPhoneOrderByCreatedAtDesc(String customerPhone);
}
