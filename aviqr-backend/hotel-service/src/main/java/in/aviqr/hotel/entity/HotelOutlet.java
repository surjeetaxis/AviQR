package in.aviqr.hotel.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="hotel_outlets") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class HotelOutlet {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private String name;
    @Enumerated(EnumType.STRING) @Builder.Default private OutletType outletType = OutletType.RESTAURANT;
    private String description;
    private String location; // floor / wing
    private String shopId; // link to shop in shop-service (menu, POS, staff, orders)
    @Builder.Default private Boolean bookable = false; // true for slot-based outlets like spa/activity/banquet
    @Builder.Default private Boolean active = true;
    @Builder.Default private Boolean qrActive = true;
    @CreationTimestamp private LocalDateTime createdAt;
}
