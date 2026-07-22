package in.aviqr.shop.repository;

import in.aviqr.shop.entity.TaxRule;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface TaxRuleRepository extends JpaRepository<TaxRule, UUID> {
    List<TaxRule> findByShopId(String shopId, Sort sort);
    List<TaxRule> findByShopIdAndActiveTrueOrderByPriority(String shopId);
}
