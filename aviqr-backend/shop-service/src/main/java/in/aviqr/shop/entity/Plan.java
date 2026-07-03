package in.aviqr.shop.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

// A subscription plan definition, editable by admin, that customer-facing pages
// (Landing pricing, Settings > Plan & Billing, hotel/mall/supplier subscription
// pages) read live instead of hardcoding their own price tables.
@Entity @Table(name="plans")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Plan {
    @Id @GeneratedValue(strategy=GenerationType.UUID)
    private UUID id;

    // Stable identifier (e.g. STARTER, GROWTH) — matches Shop.subscriptionPlan values.
    // Immutable after creation so existing shop assignments keep resolving correctly.
    @Column(nullable=false, unique=true)
    private String planKey;

    @Column(nullable=false)
    private String label;

    @Enumerated(EnumType.STRING) @Builder.Default
    private PlanVertical vertical = PlanVertical.SHOP;

    @Column(nullable=false)
    private Integer price; // INR per month, 0 = free

    // Newline-separated feature bullets, kept simple (no child table)
    @Column(length=2000)
    private String features;

    @Builder.Default private Integer sortOrder = 0;
    @Builder.Default private Boolean active = true;

    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
}
