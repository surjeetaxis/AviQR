package in.aviqr.menu.repository;
import in.aviqr.menu.entity.MenuVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;
public interface MenuVariantRepository extends JpaRepository<MenuVariant, UUID> {
    List<MenuVariant> findByMenuItemIdOrderBySortOrderAsc(UUID menuItemId);
    @Modifying @Transactional
    void deleteByMenuItemId(UUID menuItemId);
}
