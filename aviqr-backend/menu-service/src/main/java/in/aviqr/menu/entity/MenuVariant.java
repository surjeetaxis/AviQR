package in.aviqr.menu.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * A variant of a menu item — e.g. Small / Medium / Large with individual prices.
 * Also used for: Half / Full, Single / Double, etc.
 * Multiple variants can exist for one MenuItem.
 */
@Entity @Table(name="menu_variants")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MenuVariant {
    @Id @GeneratedValue(strategy=GenerationType.UUID)
    private UUID id;

    @Column(nullable=false)
    private UUID menuItemId;           // FK → menu_items.id

    @Column(nullable=false)
    private String variantName;        // "Small", "Medium", "Large", "Half", "Full"

    @Column(nullable=false, precision=10, scale=2)
    private BigDecimal price;          // Price for this variant

    @Builder.Default
    private Boolean isDefault = false; // Default variant shown first

    @Builder.Default
    private Integer sortOrder = 0;

    @Builder.Default
    private Boolean active = true;
}
