package in.aviqr.shop.repository;

import in.aviqr.shop.entity.LoyaltyAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LoyaltyAccountRepository extends JpaRepository<LoyaltyAccount, UUID> {
    Optional<LoyaltyAccount> findByCustomerPhoneAndShopId(String customerPhone, String shopId);
    List<LoyaltyAccount> findByShopIdOrderByTotalPointsDesc(String shopId);
}
