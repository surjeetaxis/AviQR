package in.aviqr.shop.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Customer Portal: a customer (identified by phone — no account/password needed,
 * same lightweight identity model as LoyaltyAccount) can star a shop they've
 * visited before to find it again quickly, without a QR scan.
 */
@Entity
@Table(name = "customer_favorites",
    uniqueConstraints = @UniqueConstraint(columnNames = {"customerPhone", "shopId"}),
    indexes = @Index(name = "idx_favorite_phone", columnList = "customerPhone"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CustomerFavorite {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String customerPhone;

    @Column(nullable = false)
    private String shopId;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
