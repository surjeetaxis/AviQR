package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** A booking-engine reservation's online payment, taken through payment-gateway-service.
 *  Posted to the folio once, when payment-gateway-service reports it PAID. */
@Entity @Table(name="pms_online_payments") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OnlinePayment {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false, unique=true) private UUID reservationId;
    @Column(nullable=false) private UUID hotelId;
    /** The payment-gateway-service transaction. */
    @Column(nullable=false) private UUID paymentId;
    @Column(length=20) private String paymentReference;
    @Column(length=32) private String gateway;
    @Column(nullable=false, precision=12, scale=2) private BigDecimal amount;
    @Column(length=3) private String currency;
    /** DEPOSIT or FULL. */
    @Column(length=8) private String kind;
    /** The hotel requires this payment; an unpaid booking is cancelled after the payment window. */
    @Builder.Default private Boolean required = false;
    /** CREATED, PENDING, PAID, FAILED, UNVERIFIED or EXPIRED. */
    @Column(length=16) @Builder.Default private String status = "CREATED";
    @Builder.Default private Boolean posted = false;
    /** Guards against the guest's return and the sweep posting the same payment twice. */
    @Version private Long version;
    @CreationTimestamp private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
