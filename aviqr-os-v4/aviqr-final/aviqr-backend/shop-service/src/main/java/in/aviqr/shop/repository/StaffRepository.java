package in.aviqr.shop.repository;
import in.aviqr.shop.entity.ShopStaff;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*; import java.util.UUID;

public interface StaffRepository extends JpaRepository<ShopStaff, UUID> {
    List<ShopStaff> findByShopId(UUID shopId);
    Optional<ShopStaff> findByShopIdAndUserId(UUID shopId, String userId);
    boolean existsByShopIdAndEmail(UUID shopId, String email);
}
