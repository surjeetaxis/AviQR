package in.aviqr.hotel.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="room_requests") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RoomRequest {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private String roomNumber;
    @Column(nullable=false) private String serviceType; // ROOM_SERVICE, LAUNDRY, SPA, MAINTENANCE, HOUSEKEEPING
    @Column(nullable=false) private String description;
    @Enumerated(EnumType.STRING) @Builder.Default private RequestStatus status = RequestStatus.NEW;
    @Enumerated(EnumType.STRING) @Builder.Default private RequestPriority priority = RequestPriority.NORMAL;
    private String notes; private String assignedTo;
    @CreationTimestamp private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
}