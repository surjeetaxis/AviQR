package in.aviqr.order.repository;
import in.aviqr.order.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface BillRepository extends JpaRepository<Bill, UUID> {
    Optional<Bill> findByShopIdAndTableNumberAndStatus(String shopId, String tableNumber, BillStatus status);
    List<Bill> findByShopIdAndStatus(String shopId, BillStatus status);
}
