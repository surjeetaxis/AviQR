package in.aviqr.shop.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="vendors") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Vendor {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID mallId;
    @Column(nullable=false) private String name;
    private String category; private String floor; private String contact;
    private String shopId; // link to shop in shop-service
    @Builder.Default private Boolean active = true;
    @Builder.Default private Boolean qrActive = true;
    // PENDING = mall admin requested a link, awaiting the shop owner's decision.
    // ACTIVE = linked (either accepted, or added directly via the old addVendor path).
    // REJECTED = owner declined; never shown publicly.
    @Enumerated(EnumType.STRING) @Builder.Default private VendorStatus status = VendorStatus.ACTIVE;
    @CreationTimestamp private LocalDateTime createdAt;
}