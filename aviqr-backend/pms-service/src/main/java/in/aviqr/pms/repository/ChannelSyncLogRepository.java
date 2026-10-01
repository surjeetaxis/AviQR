package in.aviqr.pms.repository;

import in.aviqr.pms.entity.ChannelSyncLog;
import in.aviqr.pms.entity.SyncDirection;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.UUID;

/** MongoDB-backed; filtered/paged search lives in ChannelSyncLogSearch. */
public interface ChannelSyncLogRepository extends MongoRepository<ChannelSyncLog, UUID> {
    List<ChannelSyncLog> findTop50ByHotelIdOrderByCreatedAtDesc(UUID hotelId);

    // Recent pushes for a hotel — the overview/calendar derive each room type's last
    // sync per type from these rather than one query per (room type, type).
    List<ChannelSyncLog> findTop500ByHotelIdAndDirectionOrderByCreatedAtDesc(UUID hotelId, SyncDirection direction);
}
