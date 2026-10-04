package in.aviqr.pms.repository;

import in.aviqr.pms.entity.PromoCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PromoCodeRepository extends JpaRepository<PromoCode, UUID> {
    Optional<PromoCode> findByHotelIdAndCodeIgnoreCase(UUID hotelId, String code);
    List<PromoCode> findByHotelIdOrderByCreatedAtDesc(UUID hotelId);
}
