package in.aviqr.shop.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * MARKET FEATURE: SMS CRM campaigns — birthday/anniversary wishes and
 * segment-targeted broadcasts, sent via TwilioSmsService (notification-report-review-service).
 */
@Entity
@Table(name = "campaigns", indexes = @Index(name = "idx_campaigns_shop", columnList = "shopId"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Campaign {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String shopId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String messageTemplate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CampaignAudienceType audienceType;

    private String audienceLabel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private CampaignStatus status = CampaignStatus.DRAFT;

    private LocalDateTime scheduledAt;
    private LocalDateTime lastRunAt;

    @Builder.Default
    private Integer sentCount = 0;

    @Builder.Default
    private Integer failedCount = 0;

    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
}
