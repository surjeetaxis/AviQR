package in.aviqr.pms.repository;

import in.aviqr.pms.entity.Surcharge;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface SurchargeRepository extends JpaRepository<Surcharge, UUID> {
    List<Surcharge> findByHotelId(UUID hotelId);
    List<Surcharge> findByHotelIdAndActiveTrue(UUID hotelId);
}
