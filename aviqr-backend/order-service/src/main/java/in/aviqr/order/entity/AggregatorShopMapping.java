package in.aviqr.order.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="aggregator_shop_mapping") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AggregatorShopMapping {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private String shopId;
    @Column(nullable=false) private String platform;         // ZOMATO, SWIGGY
    @Column(nullable=false) private String aggregatorShopId;  // Zomato restaurant id / Swiggy outlet id
    @CreationTimestamp private LocalDateTime createdAt;
}