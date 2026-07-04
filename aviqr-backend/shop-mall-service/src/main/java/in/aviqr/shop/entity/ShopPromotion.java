package in.aviqr.shop.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

// A shop's own customer-facing discount/promotion (e.g. "FLAT500 · ₹500 OFF"),
// distinct from Offer (a platform-level SaaS billing-plan discount). Shop owners
// manage these themselves; posters/QR flows pull the active ones to display.
@Entity @Table(name = "shop_promotions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ShopPromotion {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String shopId;

    @Column(nullable = false)
    private String code; // e.g. "FLAT500", "WELCOME10"

    @Column(nullable = false)
    private String label; // e.g. "₹500 OFF", "10% OFF"

    @Enumerated(EnumType.STRING) @Builder.Default
    private PromotionDiscountType discountType = PromotionDiscountType.FIXED;

    private Double discountValue; // 500 for FIXED (rupees), 10 for PERCENTAGE

    private LocalDateTime startsAt; // null = starts immediately
    private LocalDateTime endsAt;   // null = no end date

    @Builder.Default private Boolean active = true;

    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
}
