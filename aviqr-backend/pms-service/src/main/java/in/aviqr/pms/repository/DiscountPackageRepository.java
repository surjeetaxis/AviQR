package in.aviqr.pms.repository;

import in.aviqr.pms.entity.DiscountPackage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface DiscountPackageRepository extends JpaRepository<DiscountPackage, UUID> {
    List<DiscountPackage> findByHotelId(UUID hotelId);
    List<DiscountPackage> findByHotelIdAndActiveTrue(UUID hotelId);
}
