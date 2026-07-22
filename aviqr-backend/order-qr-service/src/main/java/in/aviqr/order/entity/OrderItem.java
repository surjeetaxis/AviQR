package in.aviqr.order.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity @Table(name="order_items") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrderItem {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="order_id") private Order order;
    @Column(nullable=false) private UUID menuItemId;
    @Column(nullable=false) private String itemName;
    // e.g. "Large", "Half" — the variant selected at order time (unitPrice already reflects it)
    private String variantName;
    @Column(nullable=false) private Integer quantity;
    @Column(nullable=false, precision=10, scale=2) private BigDecimal unitPrice;
    @Column(nullable=false, precision=10, scale=2) private BigDecimal totalPrice;
    private String notes;
    @ElementCollection(fetch=FetchType.EAGER)
    @CollectionTable(name="order_item_addons", joinColumns=@JoinColumn(name="order_item_id"))
    @Builder.Default private List<OrderItemAddon> addons = new ArrayList<>();
}