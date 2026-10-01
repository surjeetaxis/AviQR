package in.aviqr.pms.repository;

import in.aviqr.pms.entity.ChannelName;
import in.aviqr.pms.entity.ChannelSyncLog;
import in.aviqr.pms.entity.SyncDirection;
import in.aviqr.pms.entity.SyncStatus;
import in.aviqr.pms.entity.SyncType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ChannelSyncLogRepository extends JpaRepository<ChannelSyncLog, UUID> {
    List<ChannelSyncLog> findTop50ByHotelIdOrderByCreatedAtDesc(UUID hotelId);

    // Sync Logs page: every filter optional. roomTypeId matches inside the
    // comma-separated roomTypeIds column (UUIDs can't collide as substrings).
    @Query("""
        select l from ChannelSyncLog l
        where l.hotelId = :hotelId
          and (:channel is null or l.channel = :channel)
          and (:syncType is null or l.syncType = :syncType)
          and (:status is null or l.status = :status)
          and (:direction is null or l.direction = :direction)
          and (:roomTypeId is null or l.roomTypeIds like concat('%', :roomTypeId, '%'))
        order by l.createdAt desc
        """)
    Page<ChannelSyncLog> search(@Param("hotelId") UUID hotelId,
                                @Param("channel") ChannelName channel,
                                @Param("syncType") SyncType syncType,
                                @Param("status") SyncStatus status,
                                @Param("direction") SyncDirection direction,
                                @Param("roomTypeId") String roomTypeId,
                                Pageable pageable);

    // Recent pushes for a hotel — the overview/calendar derive each room type's last
    // sync per type from these rather than one query per (room type, type).
    List<ChannelSyncLog> findTop500ByHotelIdAndDirectionOrderByCreatedAtDesc(UUID hotelId, SyncDirection direction);
}
