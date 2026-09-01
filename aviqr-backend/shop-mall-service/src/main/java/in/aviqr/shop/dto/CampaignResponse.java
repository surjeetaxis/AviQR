package in.aviqr.shop.dto;

import in.aviqr.shop.entity.Campaign;
import in.aviqr.shop.entity.CampaignAudienceType;
import in.aviqr.shop.entity.CampaignChannel;
import in.aviqr.shop.entity.CampaignStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CampaignResponse {
    private UUID id;
    private String name;
    private String messageTemplate;
    private CampaignAudienceType audienceType;
    private String audienceLabel;
    private Double radiusKm;
    private CampaignChannel channel;
    private String subject;
    private CampaignStatus status;
    private LocalDateTime scheduledAt;
    private LocalDateTime lastRunAt;
    private Integer sentCount;
    private Integer failedCount;
    private LocalDateTime createdAt;

    public static CampaignResponse from(Campaign c) {
        return CampaignResponse.builder()
            .id(c.getId())
            .name(c.getName())
            .messageTemplate(c.getMessageTemplate())
            .audienceType(c.getAudienceType())
            .audienceLabel(c.getAudienceLabel())
            .radiusKm(c.getRadiusKm())
            .channel(c.getChannel())
            .subject(c.getSubject())
            .status(c.getStatus())
            .scheduledAt(c.getScheduledAt())
            .lastRunAt(c.getLastRunAt())
            .sentCount(c.getSentCount())
            .failedCount(c.getFailedCount())
            .createdAt(c.getCreatedAt())
            .build();
    }
}
