package in.aviqr.menu.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity @Table(name="pricing_rules") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PricingRule {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private String shopId;
    @Column(nullable=false) private String name;
    @Enumerated(EnumType.STRING) private RuleType type;
    // time-based
    private LocalTime fromTime; private LocalTime toTime;
    // day-based
    private String daysOfWeek; // JSON: ["SATURDAY","SUNDAY"]
    // date-based
    private LocalDate fromDate; private LocalDate toDate;
    // adjustment
    @Enumerated(EnumType.STRING) private AdjustmentType adjustmentType;
    @Column(precision=10, scale=2) private BigDecimal adjustmentValue;
    private Integer priority;
    @Builder.Default private Boolean active = true;
}