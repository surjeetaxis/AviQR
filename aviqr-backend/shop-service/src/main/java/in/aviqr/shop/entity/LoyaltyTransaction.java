// ── FILE: shop-service/src/main/java/in/aviqr/shop/entity/LoyaltyTransaction.java ──
package in.aviqr.shop.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** Audit log for every points earn/redeem event */
@Entity
@Table(name = "loyalty_transactions",
    indexes = @Index(name = "idx_lt_account", columnList = "loyaltyAccountId"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoyaltyTransaction {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID loyaltyAccountId;

    private String shopId;
    private String orderId;

    @Enumerated(EnumType.STRING)
    private TransactionType type;  // EARN | REDEEM | EXPIRE | ADJUST

    @Column(nullable = false)
    private Integer points;        // positive = earn, negative = redeem

    private BigDecimal orderAmount;
    private String description;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public enum TransactionType { EARN, REDEEM, EXPIRE, ADJUST }
}
