package in.aviqr.qr.repository;
import in.aviqr.qr.entity.QrCode;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface QrCodeRepository extends JpaRepository<QrCode, UUID> {
    List<QrCode> findByShopId(String shopId);
    Optional<QrCode> findByQrCode(String qrCode);
    boolean existsByQrCode(String qrCode);
}