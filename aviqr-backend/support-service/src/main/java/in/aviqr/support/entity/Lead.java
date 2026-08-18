package in.aviqr.support.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

// A prospective AviQR customer (restaurant/hotel/mall owner) being manually
// worked as a sales lead — distinct from shop-mall-service's Customer entity,
// which tracks a shop's own diners, not AviQR's own prospects.
@Entity @Table(name = "leads")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Lead {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false) private String businessName;
    private String contactName;
    private String phone;
    private String email;
    private String city;

    // Required at creation (enforced in the controller, not @Column(nullable=false),
    // so existing rows imported before this field mattered aren't a migration hazard) —
    // records *why* AviQR has a legitimate basis to email this business (referral,
    // event met at, an opt-in directory, etc). Never optional: this is the compliance
    // guardrail against turning "nearby restaurants" into a cold-scrape spam list.
    @Column(length = 500)
    private String consentBasis;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private LeadStatus status = LeadStatus.NEW;

    private String assignedTo;

    @Column(length = 2000)
    private String notes;

    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
    private LocalDateTime lastContactedAt;

    // How many auto-drafted follow-ups LeadFollowUpScheduler has generated for
    // this lead so far (0 = none yet, only the initial contact). Drives the
    // cadence directly instead of counting LeadEmail rows, since staff can add
    // their own extra emails without that affecting the auto follow-up schedule.
    @Builder.Default
    private Integer followUpStage = 0;
}
