package in.aviqr.pms.repository;

import in.aviqr.pms.entity.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoomTypeRepository extends JpaRepository<RoomType, UUID> {
    List<RoomType> findByHotelId(UUID hotelId);
    List<RoomType> findByHotelIdAndActiveTrue(UUID hotelId);
    // Used by ChainTemplateService to push a chain-level template idempotently —
    // matching by name identifies "the same" room type across a re-push.
    Optional<RoomType> findByHotelIdAndName(UUID hotelId, String name);
}
