package in.aviqr.payment.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="payments") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Payment {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(unique=true, nullable=false) private String paymentId; // Razorpay payment ID
    private String orderId; // either an Order id or a Bill id — see targetType
    @Enumerated(EnumType.STRING) @Builder.Default private PaymentTargetType targetType = PaymentTargetType.ORDER;
    private String razorpayOrderId;
    @Column(nullable=false) private String shopId;
    private String customerId;
    @Column(nullable=false, precision=10, scale=2) private BigDecimal amount;
    @Column(nullable=false) private String currency;
    @Enumerated(EnumType.STRING) @Builder.Default private PaymentStatus status = PaymentStatus.PENDING;
    @Enumerated(EnumType.STRING) private PaymentGateway gateway;
    private String gatewayResponse; // raw JSON
    private String failureReason;
    @CreationTimestamp private LocalDateTime createdAt;
    private LocalDateTime paidAt;
    private LocalDateTime refundedAt;

    // Set once this payment has been folded into a nightly/manual settlement batch —
    // null means "captured but not yet settled".
    private UUID settlementId;
}