package in.aviqr.menu.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity @Table(name="menu_items") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MenuItem {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private String name;
    private String nameHi; private String nameTa; private String nameTe;
    private String description; private String descriptionHi;
    @Column(nullable=false) private UUID categoryId;
    @Column(nullable=false) private String shopId;
    @Column(nullable=false, precision=10, scale=2) private BigDecimal price;
    private String imageUrl;
    @Builder.Default private Boolean veg = true;
    @Builder.Default private Boolean spicy = false;
    @Builder.Default private Boolean popular = false;
    @Builder.Default private Boolean available = true;
    private String tag; // bestseller, spicy, veg, new
    private Integer sortOrder;

    // ── Product Ranking ──────────────────────────────────────
    private String slug;
    @Builder.Default private BigDecimal rating = BigDecimal.ZERO;
    @Builder.Default private Integer ratingCount = 0;
    @Builder.Default private BigDecimal seoScore = BigDecimal.ZERO;
    @Builder.Default private BigDecimal conversionRate = BigDecimal.ZERO;
    @Builder.Default private Integer salesVolume = 0;
    @Builder.Default private BigDecimal rankingScore = BigDecimal.ZERO;

    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;

    @PrePersist @PreUpdate
    private void ensureSlug() {
        if ((slug == null || slug.isBlank()) && name != null) {
            slug = name.toLowerCase().replaceAll("[^a-z0-9 ]", "").trim().replaceAll("\\s+", "-");
        }
    }
}