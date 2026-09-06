package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="pms_rate_plans") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RatePlan {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private UUID roomTypeId;
    @Column(nullable=false) private String name;
    @Column(precision=10, scale=2, nullable=false) private BigDecimal baseRate;
    private String cancellationPolicy;
    // Optional occupancy tier this plan is priced for (1=single, 2=double, 3=triple…).
    // Null means "not occupancy-specific" — the common case, and how every rate plan
    // created before this field existed behaves. A hotel that prices by occupancy
    // creates one RatePlan per tier under the same room type (e.g. "Single
    // Occupancy" occupancy=1, "Double Occupancy" occupancy=2) rather than this being
    // a second pricing dimension under one plan — keeps booking/folio price lookup
    // as "pick a rate plan" with no change to that flow.
    private Integer occupancy;
    @Enumerated(EnumType.STRING) @Builder.Default private MealPlan mealPlan = MealPlan.ROOM_ONLY;
    @Builder.Default private Boolean active = true;
    @CreationTimestamp private LocalDateTime createdAt;
}
