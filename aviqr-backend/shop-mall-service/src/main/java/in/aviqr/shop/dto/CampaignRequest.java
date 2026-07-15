package in.aviqr.shop.dto;

import in.aviqr.shop.entity.CampaignAudienceType;
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
    private LocalDateTime scheduledAt;
}
