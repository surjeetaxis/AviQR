package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** A chain-level rate plan under a ChainRoomTypeTemplate — see that class's javadoc. */
@Entity @Table(name="pms_chain_rate_plan_templates") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChainRatePlanTemplate {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID chainId;
    @Column(nullable=false) private UUID roomTypeTemplateId;
    @Column(nullable=false) private String name;
    @Column(precision=10, scale=2, nullable=false) private BigDecimal baseRate;
    private String cancellationPolicy;
    @Enumerated(EnumType.STRING) @Builder.Default private MealPlan mealPlan = MealPlan.ROOM_ONLY;
    @Builder.Default private Boolean active = true;
    @CreationTimestamp private LocalDateTime createdAt;
}
