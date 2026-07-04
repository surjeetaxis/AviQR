package in.aviqr.menu.repository;
import in.aviqr.menu.entity.PricingRule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface PricingRuleRepository extends JpaRepository<PricingRule, UUID> {
    List<PricingRule> findByShopIdAndActiveTrueOrderByPriority(String shopId);
}