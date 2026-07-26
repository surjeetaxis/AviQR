package in.aviqr.shop.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="malls") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Mall {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private String name;
    private String adminId; private String city; private String address;
    private Double latitude; private Double longitude;
    private String phone; private String email; private String logoUrl;
    @Builder.Default private BigDecimal commissionPercent = BigDecimal.valueOf(10);
    private String subscriptionPlan;
    @Builder.Default private Boolean active = true;
    @CreationTimestamp private LocalDateTime createdAt;
}