package in.aviqr.shop.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

/** One row per campaign send attempt — delivery visibility + same-day dedup for recurring campaigns. */
@Entity
@Table(name = "campaign_logs", indexes = @Index(name = "idx_campaign_logs_campaign", columnList = "campaignId"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CampaignLog {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID campaignId;

    @Column(nullable = false)
    private String shopId;

    @Column(nullable = false)
    private String customerPhone;

    private String customerName;

    @Column(nullable = false, length = 20)
    private String status; // SENT | FAILED

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    @CreationTimestamp
    private LocalDateTime sentAt;
}
