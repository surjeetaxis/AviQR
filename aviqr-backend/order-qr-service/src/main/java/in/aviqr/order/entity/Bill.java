package in.aviqr.order.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** A consolidated table bill — groups every not-yet-billed order for a table (opened
 *  across possibly several rounds during the same sitting) into one payable total.
 *  Generated on explicit action (waiter/owner/customer), not automatically per-order. */
@Entity @Table(name="bills") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Bill {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false, length=100) private String shopId;
    @Column(nullable=false, length=10) private String tableNumber;
    @Enumerated(EnumType.STRING) @Column(length=20) @Builder.Default private BillStatus status = BillStatus.OPEN;
    @Column(nullable=false, precision=10, scale=2) private BigDecimal subtotal;
    @Column(precision=10, scale=2) @Builder.Default private BigDecimal discount = BigDecimal.ZERO;
    @Column(precision=10, scale=2) @Builder.Default private BigDecimal serviceCharge = BigDecimal.ZERO;
    @Column(precision=10, scale=2) @Builder.Default private BigDecimal tax = BigDecimal.ZERO;
    @Column(nullable=false, precision=10, scale=2) private BigDecimal totalAmount;
    @Enumerated(EnumType.STRING) @Column(length=20) private PaymentMethod paymentMethod;
    @CreationTimestamp private LocalDateTime createdAt;
    private String generatedBy;
    private LocalDateTime paidAt;
    private String settledBy;
}
