package in.aviqr.mall.repository;
import in.aviqr.mall.entity.Mall;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*; public interface MallRepository extends JpaRepository<Mall,UUID> { List<Mall> findByAdminIdOrderByCreatedAtAsc(String a); }