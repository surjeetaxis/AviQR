package in.aviqr.pms.repository;

import in.aviqr.pms.entity.ChannelSyncLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ChannelSyncLogRepository extends JpaRepository<ChannelSyncLog, UUID> {
    List<ChannelSyncLog> findTop50ByHotelIdOrderByCreatedAtDesc(UUID hotelId);
}
