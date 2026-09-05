package in.aviqr.pms.repository;

import in.aviqr.pms.entity.Waitlist;
import in.aviqr.pms.entity.WaitlistStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface WaitlistRepository extends JpaRepository<Waitlist, UUID> {
    List<Waitlist> findByHotelIdOrderByCreatedAtDesc(UUID hotelId);
    List<Waitlist> findByHotelIdAndRoomTypeIdAndStatus(UUID hotelId, UUID roomTypeId, WaitlistStatus status);
}
