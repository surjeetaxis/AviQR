package in.aviqr.mall.repository;
import in.aviqr.mall.entity.Vendor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*; public interface VendorRepository extends JpaRepository<Vendor,UUID> {
    List<Vendor> findByMallId(UUID mallId); List<Vendor> findByMallIdAndActiveTrue(UUID mallId); }