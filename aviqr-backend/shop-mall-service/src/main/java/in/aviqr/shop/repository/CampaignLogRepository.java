package in.aviqr.shop.repository;

import in.aviqr.shop.entity.CampaignLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface CampaignLogRepository extends JpaRepository<CampaignLog, UUID> {
    List<CampaignLog> findByCampaignIdOrderBySentAtDesc(UUID campaignId);
    boolean existsByCampaignIdAndCustomerPhoneAndSentAtBetween(UUID campaignId, String customerPhone, LocalDateTime from, LocalDateTime to);
}
