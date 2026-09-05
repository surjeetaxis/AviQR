package in.aviqr.hotel.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="housekeeping_tasks") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class HousekeepingTask {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private UUID roomId;
    @Column(nullable=false) private String roomNumber;
    @Enumerated(EnumType.STRING) @Builder.Default private HousekeepingTaskStatus status = HousekeepingTaskStatus.PENDING;
    @Enumerated(EnumType.STRING) @Builder.Default private RequestPriority priority = RequestPriority.NORMAL;
    private String assignedTo;
    private String notes;
    @CreationTimestamp private LocalDateTime createdAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private LocalDateTime inspectedAt;
    private String inspectedBy;
}
