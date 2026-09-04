package in.aviqr.order.repository;
import in.aviqr.order.dto.RoomScanRow;
import in.aviqr.order.entity.QrCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface QrCodeRepository extends JpaRepository<QrCode, UUID> {
    List<QrCode> findByShopId(String shopId);
    Optional<QrCode> findByQrCode(String qrCode);
    boolean existsByQrCode(String qrCode);

    // Sums scanCount across every row ever created for a room (a regenerate
    // leaves the deactivated old row's tally in place) so "most-scanned rooms"
    // reflects the room's full history, not just its current QR code.
    @Query("SELECT q.groupParam AS groupParam, MAX(q.label) AS label, SUM(q.scanCount) AS total " +
        "FROM QrCode q WHERE q.shopId = :shopId AND q.type = in.aviqr.order.entity.QrType.HOTEL_ROOM " +
        "GROUP BY q.groupParam ORDER BY SUM(q.scanCount) DESC")
    List<RoomScanRow> scansByRoom(@Param("shopId") String shopId);
}