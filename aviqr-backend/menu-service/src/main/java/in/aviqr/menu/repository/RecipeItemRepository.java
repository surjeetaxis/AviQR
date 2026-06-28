package in.aviqr.menu.repository;
import in.aviqr.menu.entity.RecipeItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface RecipeItemRepository extends JpaRepository<RecipeItem, UUID> {
    List<RecipeItem> findByMenuItemId(UUID menuItemId);
    void deleteByMenuItemId(UUID menuItemId);
}
