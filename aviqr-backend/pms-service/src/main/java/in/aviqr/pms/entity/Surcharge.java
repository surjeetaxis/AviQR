package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** A named, hotel-wide per-night charge (city tax, resort fee, service charge) —
 *  CRS's Surcharge, simplified: no per-room-type/meal-plan/occupancy-level scoping,
 *  just a flat or percent-of-room-rate amount applied to every stay at check-in
 *  (see ReservationService.checkIn). */
@Entity @Table(name="pms_surcharges") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Surcharge {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private String name;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private ValueType valueType;
    @Column(precision=10, scale=2, nullable=false) private BigDecimal value;
    @Builder.Default private Boolean active = true;
    @CreationTimestamp private LocalDateTime createdAt;
}
