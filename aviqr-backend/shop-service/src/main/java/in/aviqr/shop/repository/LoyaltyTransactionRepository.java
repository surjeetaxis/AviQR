package in.aviqr.shop.repository;

import in.aviqr.shop.entity.LoyaltyTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LoyaltyTransactionRepository extends JpaRepository<LoyaltyTransaction, UUID> {
    List<LoyaltyTransaction> findByLoyaltyAccountIdOrderByCreatedAtDesc(UUID loyaltyAccountId);
}
