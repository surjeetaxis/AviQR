package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** A travel agent/agency the hotel takes bookings through — separate from the
 *  channel-manager/OTA flow (ChannelMapping): an agent calls the front desk or emails
 *  a booking in, rather than sending it through an ARI-integrated channel. */
@Entity @Table(name="pms_agents") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Agent {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private String name;
    private String contactPerson;
    private String phone;
    private String email;
    // Default rate applied to a new booking unless the booking specifies its own —
    // see CreateReservationRequest.commissionPercent.
    @Column(precision=5, scale=2, nullable=false) private BigDecimal commissionPercent;
    // TDS withheld from commission payouts (Indian tax law, Section 194H) — CRS's
    // AgentTds, folded onto Agent since it's a 1:1 rate, not a separate history.
    @Column(precision=5, scale=2) @Builder.Default private BigDecimal tdsPercent = BigDecimal.ZERO;
    @Builder.Default private Boolean active = true;
    private String notes;
    @CreationTimestamp private LocalDateTime createdAt;
}
