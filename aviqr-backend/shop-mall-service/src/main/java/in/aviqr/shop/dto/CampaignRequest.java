package in.aviqr.shop.dto;

import in.aviqr.shop.entity.CampaignAudienceType;
import in.aviqr.shop.entity.CampaignChannel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CampaignRequest {
    @NotBlank private String name;
    @NotBlank private String messageTemplate;
    @NotNull  private CampaignAudienceType audienceType;
    private String audienceLabel;
    // Required when audienceType == NEARBY — checked in CampaignService#create.
    private Double radiusKm;
    private CampaignChannel channel = CampaignChannel.SMS;
    // Required when channel == EMAIL — checked in CampaignService#create.
    private String subject;
    private LocalDateTime scheduledAt;
}
