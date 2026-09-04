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
    @Enumerated(EnumType.STRING) @Builder.Default private MealPlan mealPlan = MealPlan.ROOM_ONLY;
    @Builder.Default private Boolean active = true;
    @CreationTimestamp private LocalDateTime createdAt;
}
