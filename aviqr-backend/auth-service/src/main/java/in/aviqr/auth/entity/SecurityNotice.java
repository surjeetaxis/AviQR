package in.aviqr.auth.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;
@Entity @Table(name="security_notice_outbox") @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class SecurityNotice {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 private UUID userId; private String email; private String kind; private String status; private String ipAddress;
 @Column(length=500) private String message;
 private LocalDateTime createdAt; private LocalDateTime sentAt; private LocalDateTime nextAttemptAt;
 private int attempts;
}
