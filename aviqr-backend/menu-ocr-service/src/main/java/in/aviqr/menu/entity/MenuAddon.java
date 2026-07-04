package in.aviqr.menu.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * Add-ons that can be added to menu items — e.g. Extra Cheese ₹30, Extra Sauce ₹20.
 * Add-ons belong to a shop and can be linked to multiple menu items via MenuItemAddon.
 */
@Entity @Table(name="menu_addons")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MenuAddon {
    @Id @GeneratedValue(strategy=GenerationType.UUID)
    private UUID id;

    @Column(nullable=false)
    private String shopId;

    @Column(nullable=false)
    private String name;               // "Extra Cheese", "Extra Sauce", "Masala"

    @Column(nullable=false, precision=10, scale=2)
    private BigDecimal price;          // Additional charge

    @Builder.Default
    private Boolean veg = true;

    @Builder.Default
    private Boolean active = true;

    private Integer sortOrder;
}
