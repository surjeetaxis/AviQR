package in.aviqr.order.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Entity @Table(name="orders") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Order {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(unique=true, nullable=false, length=50) private String orderNumber;
    @Column(nullable=false, length=100) private String shopId;
    @Column(length=100) private String customerId;
    @Column(nullable=false) private String customerName;
    @Column(length=20) private String customerPhone;
    @Column(length=10) private String tableNumber;
    private UUID hotelId;      // set when paymentMethod=ROOM_CHARGE
    private String roomNumber; // set when paymentMethod=ROOM_CHARGE
    @Enumerated(EnumType.STRING) @Column(length=20) @Builder.Default private OrderType type = OrderType.DINE_IN;
    @Enumerated(EnumType.STRING) @Column(length=20) @Builder.Default private OrderStatus status = OrderStatus.NEW;
    @Enumerated(EnumType.STRING) @Column(length=20) @Builder.Default private PaymentMethod paymentMethod = PaymentMethod.ONLINE;
    @Enumerated(EnumType.STRING) @Column(length=20) @Builder.Default private PaymentStatus paymentStatus = PaymentStatus.PENDING;
    @Column(length=100) private String paymentId;
    @Column(nullable=false, precision=10, scale=2) private BigDecimal subtotal;
    @Column(precision=10, scale=2) @Builder.Default private BigDecimal discount = BigDecimal.ZERO;
    @Column(precision=10, scale=2) @Builder.Default private BigDecimal serviceCharge = BigDecimal.ZERO;
    @Column(precision=10, scale=2) @Builder.Default private BigDecimal tax = BigDecimal.ZERO;
    @Column(nullable=false, precision=10, scale=2) private BigDecimal totalAmount;
    private String notes;
    @Column(length=6) private String confirmationCode;
    private LocalDateTime paymentConfirmedAt;
    @OneToMany(mappedBy="order", cascade=CascadeType.ALL, orphanRemoval=true, fetch=FetchType.EAGER)
    @Builder.Default private List<OrderItem> items = new ArrayList<>();
    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
    private LocalDateTime acceptedAt;
    private LocalDateTime completedAt;
}