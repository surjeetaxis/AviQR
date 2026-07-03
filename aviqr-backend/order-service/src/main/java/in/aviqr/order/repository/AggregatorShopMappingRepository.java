package in.aviqr.order.repository;
import in.aviqr.order.entity.AggregatorShopMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AggregatorShopMappingRepository extends JpaRepository<AggregatorShopMapping, UUID> {
    List<AggregatorShopMapping> findByShopId(String shopId);
    Optional<AggregatorShopMapping> findByPlatformAndAggregatorShopId(String platform, String aggregatorShopId);
    Optional<AggregatorShopMapping> findByShopIdAndPlatform(String shopId, String platform);
}