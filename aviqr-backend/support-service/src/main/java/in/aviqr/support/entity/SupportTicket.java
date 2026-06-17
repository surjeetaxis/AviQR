package in.aviqr.support.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="support_tickets") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SupportTicket {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(unique=true,nullable=false) private String ticketNumber;
    private String userId; private String userName; private String userRole;
    @Column(nullable=false) private String subject;
    @Column(length=2000) private String description;
    @Enumerated(EnumType.STRING) @Builder.Default private TicketPriority priority = TicketPriority.MEDIUM;
    @Enumerated(EnumType.STRING) @Builder.Default private TicketStatus status = TicketStatus.OPEN;
    private String assignedTo;
    private String resolution;
    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
    private LocalDateTime resolvedAt;
}