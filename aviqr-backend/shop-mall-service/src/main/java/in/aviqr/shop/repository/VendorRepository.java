package in.aviqr.shop.repository;
import in.aviqr.shop.entity.Vendor;
import in.aviqr.shop.entity.VendorStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface VendorRepository extends JpaRepository<Vendor,UUID> {
    List<Vendor> findByMallId(UUID mallId);
    List<Vendor> findByMallIdAndActiveTrue(UUID mallId);
    List<Vendor> findByMallIdAndStatusAndActiveTrue(UUID mallId, VendorStatus status);
    Optional<Vendor> findByMallIdAndShopId(UUID mallId, String shopId);
    List<Vendor> findByShopIdInAndStatus(List<String> shopIds, VendorStatus status);
}
