package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** One row per agent-sourced Reservation — commissionPercent/commissionAmount are
 *  snapshotted at booking time (against the quoted room revenue) so a later change to
 *  the agent's default rate never retroactively changes an already-booked commission. */
@Entity @Table(name="pms_reservation_commissions") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReservationCommission {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private UUID reservationId;
    @Column(nullable=false) private UUID agentId;
    @Column(precision=5, scale=2, nullable=false) private BigDecimal commissionPercent;
    @Column(precision=10, scale=2, nullable=false) private BigDecimal roomRevenue;
    @Column(precision=10, scale=2, nullable=false) private BigDecimal commissionAmount;
    // Snapshotted alongside commissionPercent — see Agent.tdsPercent.
    @Column(precision=5, scale=2) @Builder.Default private BigDecimal tdsPercent = BigDecimal.ZERO;
    @Column(precision=10, scale=2) @Builder.Default private BigDecimal tdsAmount = BigDecimal.ZERO;
    // What's actually owed to the agent after withholding TDS — this is what
    // markPaid records as settled, not the gross commissionAmount.
    @Column(precision=10, scale=2) private BigDecimal netPayable;
    @Enumerated(EnumType.STRING) @Builder.Default private CommissionStatus status = CommissionStatus.PENDING;
    private LocalDateTime paidAt;
    private String paidBy;
    private String paidReference;
    @CreationTimestamp private LocalDateTime createdAt;
}
