package in.aviqr.order.repository;
import in.aviqr.order.dto.ScanEventRow;
import in.aviqr.order.dto.ScanTrendRow;
import in.aviqr.order.entity.QrScanLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface QrScanLogRepository extends JpaRepository<QrScanLog, UUID> {

    // qr_scan_logs and qr_codes aren't JPA-relationship-mapped (only share the
    // qr_code slug string), so these are plain native joins on that column.
    @Query(value = "SELECT to_char(s.scanned_at::date, 'YYYY-MM-DD') AS day, COUNT(*) AS count " +
        "FROM qr_scan_logs s JOIN qr_codes q ON q.qr_code = s.qr_code " +
        "WHERE q.shop_id = :shopId AND s.scanned_at >= :from " +
        "GROUP BY 1 ORDER BY 1", nativeQuery = true)
    List<ScanTrendRow> trendForShop(@Param("shopId") String shopId, @Param("from") LocalDateTime from);

    @Query(value = "SELECT s.scanned_at AS scannedAt, s.user_agent AS userAgent, s.ip_address AS ipAddress, " +
        "q.type AS type, q.group_param AS groupParam, q.label AS label " +
        "FROM qr_scan_logs s JOIN qr_codes q ON q.qr_code = s.qr_code " +
        "WHERE q.shop_id = :shopId ORDER BY s.scanned_at DESC LIMIT :limit", nativeQuery = true)
    List<ScanEventRow> recentForShop(@Param("shopId") String shopId, @Param("limit") int limit);
}
