package in.aviqr.menu.repository;
import in.aviqr.menu.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    List<Category> findByShopIdAndActiveTrueOrderBySortOrder(String shopId);
}