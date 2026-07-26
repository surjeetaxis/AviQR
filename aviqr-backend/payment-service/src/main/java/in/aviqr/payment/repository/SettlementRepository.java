package in.aviqr.payment.repository;
import in.aviqr.payment.entity.Settlement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface SettlementRepository extends JpaRepository<Settlement, UUID> {
    Page<Settlement> findByShopIdOrderByCreatedAtDesc(String shopId, Pageable pageable);
    Page<Settlement> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
