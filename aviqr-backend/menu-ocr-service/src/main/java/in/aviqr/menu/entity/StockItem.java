// ── FILE: menu-service/src/main/java/in/aviqr/menu/entity/StockItem.java ──────
package in.aviqr.menu.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Tracks real-time stock quantity for every menu item.
 * One StockItem row per MenuItem. Linked by menuItemId (not FK to stay loosely coupled).
 *
 * MARKET FEATURE: Basic inventory management —
 * auto-disables menu item when stockQty hits 0.
 */
@Entity
@Table(name = "stock_items", indexes = {
    @Index(name = "idx_stock_item_id", columnList = "menuItemId"),
    @Index(name = "idx_stock_shop",    columnList = "shopId")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StockItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private UUID menuItemId;

    @Column(nullable = false)
    private String shopId;

    /** null = unlimited (default for most restaurants) */
    private Integer stockQty;

    /** Threshold below which owner gets a low-stock alert */
    @Builder.Default
    private Integer lowStockThreshold = 5;

    /** If true, item goes unavailable when stockQty reaches 0 */
    @Builder.Default
    private Boolean trackStock = false;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
