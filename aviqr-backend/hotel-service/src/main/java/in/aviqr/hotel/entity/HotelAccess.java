package in.aviqr.hotel.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="hotel_access", uniqueConstraints=@UniqueConstraint(columnNames={"hotel_id","user_id","outlet_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class HotelAccess {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private String userId;
    @Enumerated(EnumType.STRING) @Builder.Default private HotelRole role = HotelRole.STAFF;
    private UUID outletId; // set for outlet-scoped OUTLET_MANAGER / STAFF rows
    @CreationTimestamp private LocalDateTime createdAt;
}
