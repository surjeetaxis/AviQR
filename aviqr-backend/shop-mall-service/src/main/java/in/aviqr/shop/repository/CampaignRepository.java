package in.aviqr.shop.repository;

import in.aviqr.shop.entity.Campaign;
import in.aviqr.shop.entity.CampaignAudienceType;
import in.aviqr.shop.entity.CampaignStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface CampaignRepository extends JpaRepository<Campaign, UUID> {
    List<Campaign> findByShopIdOrderByCreatedAtDesc(String shopId);
    List<Campaign> findByStatusAndScheduledAtLessThanEqual(CampaignStatus status, LocalDateTime now);
    List<Campaign> findByStatusAndAudienceTypeIn(CampaignStatus status, List<CampaignAudienceType> audienceTypes);
}
