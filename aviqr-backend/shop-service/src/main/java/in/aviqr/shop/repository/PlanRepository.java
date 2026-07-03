package in.aviqr.shop.repository;
import in.aviqr.shop.entity.Plan;
import in.aviqr.shop.entity.PlanVertical;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface PlanRepository extends JpaRepository<Plan, UUID> {
    List<Plan> findByActiveTrueOrderBySortOrderAsc();
    List<Plan> findByVerticalAndActiveTrueOrderBySortOrderAsc(PlanVertical vertical);
    boolean existsByPlanKey(String planKey);
}
