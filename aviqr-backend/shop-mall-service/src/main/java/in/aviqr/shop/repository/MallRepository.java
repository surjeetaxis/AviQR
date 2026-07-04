package in.aviqr.shop.repository;
import in.aviqr.shop.entity.Mall;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*; public interface MallRepository extends JpaRepository<Mall,UUID> { List<Mall> findByAdminIdOrderByCreatedAtAsc(String a); }