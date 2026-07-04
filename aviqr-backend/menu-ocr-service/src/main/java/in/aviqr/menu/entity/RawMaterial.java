package in.aviqr.menu.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Raw material / ingredient master.
 * Tracks current stock, unit cost, reorder level.
 * Used in Recipe to calculate dish cost.
 */
@Entity @Table(name="raw_materials")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RawMaterial {
    @Id @GeneratedValue(strategy=GenerationType.UUID)
    private UUID id;

    @Column(nullable=false)
    private String shopId;

    @Column(nullable=false)
    private String name;               // "Paneer", "Tomato", "Cream"

    @Column(nullable=false)
    private String unit;               // "kg", "litre", "gram", "piece", "ml"

    @Column(precision=10, scale=3)
    @Builder.Default
    private BigDecimal currentStock = BigDecimal.ZERO;

    @Column(precision=10, scale=3)
    @Builder.Default
    private BigDecimal minStockLevel = BigDecimal.ZERO;  // Reorder trigger

    @Column(precision=12, scale=2)
    @Builder.Default
    private BigDecimal costPerUnit = BigDecimal.ZERO;    // ₹ per unit

    private String supplier;           // Supplier name for reorder

    @Builder.Default
    private Boolean active = true;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
