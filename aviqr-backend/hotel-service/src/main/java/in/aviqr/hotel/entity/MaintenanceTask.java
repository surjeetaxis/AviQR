package in.aviqr.hotel.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

/** A staff-assignable work order, distinct from a guest-raised MAINTENANCE
 *  GuestServiceRequest (which reports a problem) — this tracks who's fixing it and
 *  when. roomId is nullable: a work order can target a non-room asset (lobby AC,
 *  pool pump) rather than a specific room. */
@Entity @Table(name="maintenance_tasks") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MaintenanceTask {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    private UUID roomId;
    private String roomNumber;
    @Column(nullable=false) private String title;
    private String notes;
    @Enumerated(EnumType.STRING) @Builder.Default private MaintenanceTaskStatus status = MaintenanceTaskStatus.OPEN;
    @Enumerated(EnumType.STRING) @Builder.Default private RequestPriority priority = RequestPriority.NORMAL;
    private String assignedTo;
    // Traceability back to the guest-raised request that spawned this task, if any.
    private UUID sourceRequestId;
    @CreationTimestamp private LocalDateTime createdAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
}
