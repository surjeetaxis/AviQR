package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;

/** One per hotel — a simple occupancy-threshold surge/discount rule, not a
 *  forecasting model. Real demand-pricing engines (Hotelogix/RMS Cloud) shop
 *  competitor rates and forecast demand; that's out of scope here. This is the
 *  right-sized version: staff sees a suggested price based on how full a given
 *  date already is and applies it (or not) — see DynamicPricingService. */
@Entity @Table(name="pms_dynamic_pricing_configs") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DynamicPricingConfig {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false, unique=true) private UUID hotelId;
    @Column(precision=5, scale=2) @Builder.Default private BigDecimal highOccupancyThreshold = BigDecimal.valueOf(80);
    @Column(precision=5, scale=2) @Builder.Default private BigDecimal highOccupancySurchargePercent = BigDecimal.valueOf(20);
    @Column(precision=5, scale=2) @Builder.Default private BigDecimal lowOccupancyThreshold = BigDecimal.valueOf(30);
    @Column(precision=5, scale=2) @Builder.Default private BigDecimal lowOccupancyDiscountPercent = BigDecimal.valueOf(10);
    @Builder.Default private Boolean active = true;
}
