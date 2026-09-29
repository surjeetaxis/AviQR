package in.aviqr.pms.repository;

import in.aviqr.pms.entity.ChannelMapping;
import in.aviqr.pms.entity.ChannelName;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChannelMappingRepository extends JpaRepository<ChannelMapping, UUID> {
    List<ChannelMapping> findByHotelId(UUID hotelId);
    List<ChannelMapping> findByHotelIdAndActiveTrue(UUID hotelId);
    List<ChannelMapping> findByRoomTypeIdAndActiveTrue(UUID roomTypeId);
    Optional<ChannelMapping> findByChannelAndExternalPropertyIdAndExternalRoomTypeId(
        ChannelName channel, String externalPropertyId, String externalRoomTypeId);

    // AxisRooms booking pushes carry no channel name — accessKey + hotelId identify the
    // connection and authenticate it, then each roomType.id/ratePlanId line is matched
    // against these (one room type can carry several mappings, one per rate plan).
    List<ChannelMapping> findByAccessKeyAndExternalPropertyIdAndActiveTrue(String accessKey, String externalPropertyId);

    @Query("select distinct m.hotelId from ChannelMapping m where m.active = true")
    List<UUID> findDistinctHotelIdsWithActiveMapping();
}
