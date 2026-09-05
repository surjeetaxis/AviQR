package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** A reusable named discount definition (CRS's DiscountPackage, simplified: no
 *  booking-window/cutoff-day/stay-date eligibility rules) — applied to a specific
 *  reservation via FolioService, which posts it as a negative FolioCharge. */
@Entity @Table(name="pms_discount_packages") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DiscountPackage {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private String name;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private ValueType valueType;
    @Column(precision=10, scale=2, nullable=false) private BigDecimal value;
    @Builder.Default private Boolean active = true;
    @CreationTimestamp private LocalDateTime createdAt;
}
