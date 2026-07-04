package in.aviqr.shop.repository;

import in.aviqr.shop.entity.ShopPromotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Sort;
import java.util.List;
import java.util.UUID;

public interface ShopPromotionRepository extends JpaRepository<ShopPromotion, UUID> {
    List<ShopPromotion> findByShopId(String shopId, Sort sort);
    List<ShopPromotion> findByShopIdAndActiveTrue(String shopId);
}
