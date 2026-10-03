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
    // Public booking presentation metadata. Room numbers and occupancy remain private;
    // only available-room DTOs expose these descriptive fields to prospective guests.
    private String roomSide;
    private String viewType;
    private Integer mapX;
    private Integer mapY;
    @Column(length=1000) private String panoramaUrl;
    @Column(length=1000) private String model3dUrl;
    @Column(length=1000) private String tourVideoUrl;
    @Enumerated(EnumType.STRING) @Builder.Default private RoomStatus status = RoomStatus.VACANT;
    // Independent of `status` (occupancy) — a checked-out room is VACANT but stays DIRTY
    // until housekeeping (and ideally a supervisor) clears it, so it isn't resold dirty.
    @Enumerated(EnumType.STRING) @Builder.Default private HousekeepingStatus housekeepingStatus = HousekeepingStatus.CLEAN;
    private String guestName;
    private String checkInDate; private String checkOutDate;
    @Builder.Default private Boolean qrActive = true;
}
