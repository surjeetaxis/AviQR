package in.aviqr.hotel.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

/** A guest-initiated service request from a QR scan: housekeeping, amenities, concierge, maintenance. */
@Entity @Table(name="guest_service_requests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GuestServiceRequest {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private String roomNumber;
    private String guestName;

    @Enumerated(EnumType.STRING) @Builder.Default
    private ServiceRequestType type = ServiceRequestType.HOUSEKEEPING;

    @Column(length=500) private String details;      // "2 extra towels, 1 toothbrush"

    @Enumerated(EnumType.STRING) @Builder.Default
    private RequestPriority priority = RequestPriority.NORMAL;

    @Enumerated(EnumType.STRING) @Builder.Default
    private RequestStatus status = RequestStatus.NEW;

    private String assignedTo;
    @CreationTimestamp private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
