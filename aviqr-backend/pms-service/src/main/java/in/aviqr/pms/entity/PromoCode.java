package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/** A guest-enterable code on the public booking engine that applies one of the
 *  hotel's DiscountPackages at booking. Kept in its own table so the existing
 *  discount and reservation flows never depend on it. */
@Entity @Table(name="pms_promo_codes", uniqueConstraints=@UniqueConstraint(columnNames={"hotel_id","code"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PromoCode {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(name="hotel_id", nullable=false) private UUID hotelId;
    @Column(nullable=false, length=32) private String code;
    @Column(nullable=false) private UUID discountPackageId;
    private LocalDate validFrom;
    private LocalDate validTo;
    @Builder.Default private Boolean active = true;
    @CreationTimestamp private LocalDateTime createdAt;

    public boolean validOn(LocalDate day) {
        return Boolean.TRUE.equals(active) && (validFrom == null || !day.isBefore(validFrom)) && (validTo == null || !day.isAfter(validTo));
    }
}
