package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="pms_folio_payments") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FolioPayment {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    // Exactly one of reservationId/groupId is set: an ordinary payment is scoped to one
    // guest's stay, but a group organizer paying for the whole block in one go is a
    // payment against the ReservationGroup itself, not attributable to any single room.
    private UUID reservationId;
    private UUID groupId;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private PaymentMethod method;
    @Column(precision=10, scale=2, nullable=false) private BigDecimal amount;
    private String reference;
    private String createdBy;
    @CreationTimestamp private LocalDateTime createdAt;
}
