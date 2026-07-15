package in.aviqr.shop.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

// A shop-scoped tax override, checked in priority order (lowest first, first match
// wins) before falling back to ShopSettings.taxPercent. Mirrors menu-ocr-service's
// PricingRule: `type` says which scope field below is meaningful for this rule.
@Entity @Table(name = "tax_rules")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TaxRule {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String shopId;

    @Column(nullable = false)
    private String name; // e.g. "Karnataka GST", "Spa services tax", "Banquet outlet"

    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private TaxRuleType type;

    // REGION scope — matched against the shop's own state/city unless overridden by caller
    private String state;
    private String city;

    // SERVICE_TYPE scope — matches an outlet/room/order service type (e.g. SPA, ROOM_SERVICE)
    private String outletType;

    // CATEGORY scope — matches a menu category name
    private String category;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal taxPercent;

    @Builder.Default private Integer priority = 100;
    @Builder.Default private Boolean active = true;

    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
}
