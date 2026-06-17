package in.aviqr.support.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="impersonation_logs") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ImpersonationLog {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private String agentId;
    @Column(nullable=false) private String agentName;
    @Column(nullable=false) private String targetUserId;
    @Column(nullable=false) private String targetUserName;
    @Column(nullable=false, length=1000) private String reason;
    @CreationTimestamp private LocalDateTime createdAt;
    private LocalDateTime endedAt;
}