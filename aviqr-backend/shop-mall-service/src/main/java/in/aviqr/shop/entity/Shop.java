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
    private String zone; // free-text, owner-assigned grouping for multi-outlet head-office rollups
    private String pincode;
    private String logoUrl;
    private Double latitude;
    private Double longitude;
    private String gstin;
    private String subscriptionPlan;

    @Enumerated(EnumType.STRING)
    @Builder.Default private SubscriptionStatus subscriptionStatus = SubscriptionStatus.ACTIVE;
    private LocalDateTime trialEndsAt;
    private LocalDateTime planStartedAt;
    private LocalDateTime cancelRequestedAt;

    // Every shop gets its own code to hand out (short, so it fits a shared
    // link/QR poster); referredByCode records which other shop's code this
    // one signed up with, if any — set once at creation, never changed.
    @Column(unique = true, length = 8)
    private String referralCode;
    private String referredByCode;

    private Integer minOrderAmount;
    private Integer tableCount;

    @Enumerated(EnumType.STRING)
    @Builder.Default private ShopStatus status = ShopStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Builder.Default private SellerTier tier = SellerTier.NEW;
    private BigDecimal rating;
    private Integer ratingCount;
    private BigDecimal salesVolume;
    private BigDecimal completionRate;
    private BigDecimal satisfactionScore;
    private LocalDateTime tierUpdatedAt;

    // Properly mapped collection table with FK column
    @ElementCollection(fetch=FetchType.EAGER)
    @CollectionTable(name="shop_opening_hours", joinColumns=@JoinColumn(name="shop_id"))
    private List<OpeningHour> openingHours;

    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
}
