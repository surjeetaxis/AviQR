package in.aviqr.shop.repository;
import in.aviqr.shop.entity.ShopSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ShopSettingsRepository extends JpaRepository<ShopSettings, UUID> {}
