package in.aviqr.menu.repository;
import in.aviqr.menu.entity.MenuAddon;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface MenuAddonRepository extends JpaRepository<MenuAddon, UUID> {
    List<MenuAddon> findByShopIdAndActiveTrue(String shopId);
}
