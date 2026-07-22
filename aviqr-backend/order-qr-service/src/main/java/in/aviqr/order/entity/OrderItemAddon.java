package in.aviqr.order.entity;

import jakarta.persistence.Embeddable;
import lombok.*;
import java.math.BigDecimal;

// A snapshot of one selected add-on on an order line item — name/price are
// captured at order time (like OrderItem.itemName/unitPrice), not looked up
// live from menu-ocr-service, so the bill stays stable even if the shop's
// add-on catalog changes later.
@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrderItemAddon {
    private String name;
    private BigDecimal price;
}
