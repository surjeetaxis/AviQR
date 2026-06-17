package in.aviqr.qr.repository;
import in.aviqr.qr.entity.QrScanLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface QrScanLogRepository extends JpaRepository<QrScanLog, UUID> {}