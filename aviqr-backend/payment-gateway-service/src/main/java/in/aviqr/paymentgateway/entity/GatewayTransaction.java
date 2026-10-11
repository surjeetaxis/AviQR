package in.aviqr.paymentgateway.entity;

import in.aviqr.paymentgateway.gateway.PaymentGateway;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** One online payment attempt. reference is what the gateway knows it by. */
@Entity @Table(name="pg_transactions", indexes={@Index(name="idx_pg_transactions_external", columnList="external_reference")})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GatewayTransaction {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false, unique=true, length=20) private String reference;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private UUID accountId;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=32) private PaymentGateway gateway;
    @Column(nullable=false, precision=12, scale=2) private BigDecimal amount;
    @Column(nullable=false, length=3) private String currency;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=16) private TransactionStatus status;
    /** What the payment is for, e.g. BOOKING_DEPOSIT. */
    @Column(length=40) private String purpose;
    /** The caller's id for what is being paid, e.g. the booking request id. */
    @Column(name="external_reference", length=80) private String externalReference;
    @Column(length=200) private String description;
    @Column(nullable=false, length=1000) private String returnUrl;
    @Column(length=120) private String guestName;
    @Column(length=254) private String guestEmail;
    @Column(length=32) private String guestPhone;
    /** Provider data between start and result (CredentialCipher ciphertext). */
    @Column(columnDefinition="text") private String providerState;
    @Column(length=120) private String pgTransactionId;
    @Column(length=120) private String bankTransactionId;
    @Column(length=500) private String message;
    @Builder.Default private Boolean testMode = false;
    @Version private Long version;
    @CreationTimestamp private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
