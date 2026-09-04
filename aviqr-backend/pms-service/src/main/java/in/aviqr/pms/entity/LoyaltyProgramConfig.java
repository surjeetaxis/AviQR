package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;

/** One per hotel. earnRatePercent of room revenue converts to points at checkout
 *  (e.g. 5% of a ₹2,000 stay = 100 points); redemptionValue is what one point is
 *  worth in rupees when redeemed on a folio (default ₹1 = 1 point, the simplest
 *  scheme real hotel loyalty programs like Marriott Bonvoy/IHG Rewards use a
 *  variant of). */
@Entity @Table(name="pms_loyalty_configs") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoyaltyProgramConfig {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false, unique=true) private UUID hotelId;
    @Column(precision=5, scale=2) @Builder.Default private BigDecimal earnRatePercent = BigDecimal.valueOf(5);
    @Column(precision=10, scale=2) @Builder.Default private BigDecimal redemptionValue = BigDecimal.ONE;
    @Builder.Default private Boolean active = true;
}
