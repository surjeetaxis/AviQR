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

    // Real ARI-style accept-booking calls carry no channel name — accessKey identifies
    // the connection, hotelID/roomType.id confirm which mapping it addresses.
    Optional<ChannelMapping> findByAccessKeyAndExternalPropertyIdAndExternalRoomTypeId(
        String accessKey, String externalPropertyId, String externalRoomTypeId);

    @Query("select distinct m.hotelId from ChannelMapping m where m.active = true")
    List<UUID> findDistinctHotelIdsWithActiveMapping();
}
