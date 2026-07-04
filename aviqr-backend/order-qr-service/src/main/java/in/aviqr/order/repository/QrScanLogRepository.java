package in.aviqr.order.repository;
import in.aviqr.order.entity.QrScanLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface QrScanLogRepository extends JpaRepository<QrScanLog, UUID> {}