package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="pms_folio_charges") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FolioCharge {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID reservationId;
    private UUID roomReservationId;
    @Enumerated(EnumType.STRING) @Builder.Default private FolioChargeType type = FolioChargeType.OTHER;
    @Column(nullable=false) private String description;
    @Column(precision=10, scale=2, nullable=false) private BigDecimal amount;
    // order-qr-service's Order.id, when this charge came from a POS/room-charge order —
    // makes the RabbitMQ consumer that posts these idempotent against redelivery.
    private String externalOrderId;
    @CreationTimestamp private LocalDateTime createdAt;
}
