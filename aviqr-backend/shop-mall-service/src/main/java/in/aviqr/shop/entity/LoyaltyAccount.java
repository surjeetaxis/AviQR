// ── FILE: shop-service/src/main/java/in/aviqr/shop/entity/LoyaltyAccount.java ──
package in.aviqr.shop.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * MARKET FEATURE: Customer loyalty / repeat-customer program.
 *
 * One LoyaltyAccount per (customer phone + shop).
 * Points are earned per order and redeemed at checkout.
 *
 * Default rule (configurable per shop via ShopSettings):
 *   - Earn 1 point per ₹10 spent
 *   - 100 points = ₹10 discount
 *   - Points expire after 90 days of inactivity (optional)
 */
@Entity
@Table(name = "loyalty_accounts",
    uniqueConstraints = @UniqueConstraint(columnNames = {"customerPhone", "shopId"}),
    indexes = {
        @Index(name = "idx_loyalty_phone_shop", columnList = "customerPhone, shopId"),
        @Index(name = "idx_loyalty_shop",       columnList = "shopId")
    })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoyaltyAccount {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String customerPhone;

    private String customerName;

    @Column(nullable = false)
    private String shopId;

    @Builder.Default
    private Integer totalPoints = 0;

    @Builder.Default
    private Integer lifetimePoints = 0;   // Never decremented — for tier calculation

    @Builder.Default
    private Integer totalOrders = 0;

    @Builder.Default
    private Integer totalVisits = 0;

    private java.math.BigDecimal totalSpent;

    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
    private LocalDateTime lastVisitAt;
}
