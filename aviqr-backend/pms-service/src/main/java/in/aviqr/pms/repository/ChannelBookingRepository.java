package in.aviqr.pms.repository;

import in.aviqr.pms.entity.ChannelBooking;
import in.aviqr.pms.entity.ChannelName;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface ChannelBookingRepository extends JpaRepository<ChannelBooking, UUID> {
    Optional<ChannelBooking> findByChannelAndExternalBookingId(ChannelName channel, String externalBookingId);
}
