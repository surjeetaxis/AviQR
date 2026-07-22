package in.aviqr.menu.repository;

import in.aviqr.menu.entity.MenuShortcode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MenuShortcodeRepository extends JpaRepository<MenuShortcode, UUID> {
    List<MenuShortcode> findByShopIdOrderByCodeAsc(String shopId);
    Optional<MenuShortcode> findByShopIdAndCodeIgnoreCaseAndActiveTrue(String shopId, String code);
    boolean existsByShopIdAndCodeIgnoreCase(String shopId, String code);
}
