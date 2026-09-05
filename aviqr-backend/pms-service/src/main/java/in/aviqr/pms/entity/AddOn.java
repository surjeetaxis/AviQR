package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** A purchasable extra-services catalog item (airport pickup, late checkout, extra
 *  bed) — CRS's AddOn, simplified: no photo/category/blackout-date associations.
 *  Applying one to a reservation (ReservationAddOnController) posts an ADDON
 *  FolioCharge of price × quantity. */
@Entity @Table(name="pms_addons") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AddOn {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private String name;
    private String description;
    @Column(precision=10, scale=2, nullable=false) private BigDecimal price;
    @Builder.Default private Boolean active = true;
    @CreationTimestamp private LocalDateTime createdAt;
}
