package in.aviqr.menu.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * One ingredient line in a recipe.
 * Multiple RecipeItems form the recipe for one menu item.
 * Used to calculate dish cost and deduct raw material stock on each order.
 */
@Entity @Table(name="recipe_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RecipeItem {
    @Id @GeneratedValue(strategy=GenerationType.UUID)
    private UUID id;

    @Column(nullable=false)
    private UUID menuItemId;           // FK → menu_items.id

    @Column(nullable=false)
    private UUID rawMaterialId;        // FK → raw_materials.id

    private String rawMaterialName;    // Denormalized for display

    @Column(nullable=false, precision=10, scale=3)
    private BigDecimal quantity;       // Amount used per portion

    private String unit;               // Unit of quantity

    // Calculated: quantity × raw_material.costPerUnit
    @Column(precision=10, scale=2)
    private BigDecimal costContribution;
}
