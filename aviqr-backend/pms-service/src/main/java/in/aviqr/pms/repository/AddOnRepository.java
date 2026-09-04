package in.aviqr.pms.repository;

import in.aviqr.pms.entity.AddOn;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AddOnRepository extends JpaRepository<AddOn, UUID> {
    List<AddOn> findByHotelId(UUID hotelId);
    List<AddOn> findByHotelIdAndActiveTrue(UUID hotelId);
}
