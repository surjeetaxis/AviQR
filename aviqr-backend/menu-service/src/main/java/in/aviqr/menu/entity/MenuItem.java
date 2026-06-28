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
    private String tag;
    private Integer sortOrder;
    // Analytics columns — added to schema in aviqr_setup.sql; marked @Transient
    // until a schema migration is applied on existing DBs (run aviqr_setup.sql as postgres)
    @Transient @Builder.Default private Integer salesVolume = 0;
    @Transient @Builder.Default private BigDecimal rating = BigDecimal.ZERO;
    @Transient @Builder.Default private Integer ratingCount = 0;
    @Transient @Builder.Default private BigDecimal rankingScore = BigDecimal.ZERO;
    @Transient @Builder.Default private BigDecimal seoScore = BigDecimal.ZERO;
    @Transient @Builder.Default private BigDecimal conversionRate = BigDecimal.ZERO;
    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
}