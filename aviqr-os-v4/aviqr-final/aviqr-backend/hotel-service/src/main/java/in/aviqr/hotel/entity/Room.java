package in.aviqr.hotel.entity;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity @Table(name="rooms") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Room {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private String roomNumber;
    private String roomType;
    private String floor;
    @Enumerated(EnumType.STRING) @Builder.Default private RoomStatus status = RoomStatus.VACANT;
    private String guestName;
    private String checkInDate; private String checkOutDate;
    @Builder.Default private Boolean qrActive = true;
}