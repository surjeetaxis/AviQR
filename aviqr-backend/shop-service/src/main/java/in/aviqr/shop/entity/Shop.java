package in.aviqr.shop.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity @Table(name="shops")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Shop {
    @Id @GeneratedValue(strategy=GenerationType.UUID)
    private UUID id;

    @Column(nullable=false) private String name;
    private String tagline;
    private String ownerId;
    private String phone;
    private String email;
    private String address;
    private String city;
    private String state;
    private String pincode;
    private String logoUrl;
    private Double latitude;
    private Double longitude;
    private String gstin;
    private String subscriptionPlan;
    private Integer minOrderAmount;
    private Integer tableCount;

    @Enumerated(EnumType.STRING)
    @Builder.Default private ShopStatus status = ShopStatus.ACTIVE;

    // ── Seller Tier System ───────────────────────────────────
    @Builder.Default private BigDecimal rating = BigDecimal.ZERO;
    @Builder.Default private Integer ratingCount = 0;
    @Builder.Default private BigDecimal completionRate = BigDecimal.ZERO;
    @Builder.Default private BigDecimal salesVolume = BigDecimal.ZERO;
    @Builder.Default private BigDecimal returnPercentage = BigDecimal.ZERO;
    @Builder.Default private BigDecimal satisfactionScore = BigDecimal.ZERO;
    @Enumerated(EnumType.STRING)
    @Builder.Default private SellerTier tier = SellerTier.NEW;
    private LocalDateTime tierUpdatedAt;

    // Properly mapped collection table with FK column
    @ElementCollection(fetch=FetchType.LAZY)
    @CollectionTable(name="shop_opening_hours", joinColumns=@JoinColumn(name="shop_id"))
    private List<OpeningHour> openingHours;

    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
}
