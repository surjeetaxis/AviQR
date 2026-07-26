package in.aviqr.payment.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/** One row per nightly (or manually triggered) settlement run for a shop — doubles as the
 *  audit trail: every run is recorded here, including SKIPPED (auto-settlement disabled or
 *  no unsettled transactions) and FAILED runs, not just successful ones. */
@Entity @Table(name="settlements") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Settlement {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private String shopId;
    @Column(nullable=false) private LocalDate settlementDate;
    @Column(nullable=false) private LocalDateTime periodStart;
    @Column(nullable=false) private LocalDateTime periodEnd;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=20) private SettlementStatus status;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=20) private SettlementTriggerType triggerType;
    private String triggeredBy; // uid, only set for MANUAL runs
    @Builder.Default private int transactionCount = 0;
    @Builder.Default @Column(precision=12, scale=2) private BigDecimal totalAmount = BigDecimal.ZERO;
    private String notes; // skip reason / failure reason
    @CreationTimestamp private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
