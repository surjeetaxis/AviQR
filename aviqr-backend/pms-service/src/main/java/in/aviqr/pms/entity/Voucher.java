package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** A prepaid/gift voucher (CRS's Voucher) redeemable as a folio payment method —
 *  balance is decremented as it's spent rather than a single one-time use. */
@Entity @Table(name="pms_vouchers") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Voucher {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private String code;
    @Column(precision=10, scale=2, nullable=false) private BigDecimal initialValue;
    @Column(precision=10, scale=2, nullable=false) private BigDecimal balance;
    @Builder.Default private Boolean active = true;
    @CreationTimestamp private LocalDateTime createdAt;
}
