package in.aviqr.paymentgateway.entity;

import in.aviqr.paymentgateway.gateway.PaymentGateway;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/** A hotel's merchant account on one gateway. credentials is CredentialCipher ciphertext. */
@Entity @Table(name="pg_gateway_accounts", uniqueConstraints=@UniqueConstraint(columnNames={"hotel_id","gateway"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GatewayAccount {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(name="hotel_id", nullable=false) private UUID hotelId;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=32) private PaymentGateway gateway;
    @Column(nullable=false, columnDefinition="text") private String credentials;
    /** Gateway sandbox / test environment instead of live. */
    @Builder.Default private Boolean testMode = false;
    @Builder.Default private Boolean active = true;
    /** The gateway guests pay through when the hotel has more than one. */
    @Builder.Default private Boolean preferred = false;
    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp private LocalDateTime updatedAt;
}
