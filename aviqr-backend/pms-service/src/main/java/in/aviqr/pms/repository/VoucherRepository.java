package in.aviqr.pms.repository;

import in.aviqr.pms.entity.Voucher;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VoucherRepository extends JpaRepository<Voucher, UUID> {
    List<Voucher> findByHotelId(UUID hotelId);
    Optional<Voucher> findByHotelIdAndCode(UUID hotelId, String code);
}
