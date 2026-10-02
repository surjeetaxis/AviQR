package in.aviqr.auth.entity;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
import java.time.LocalDateTime;
@Entity @Table(name="passkey_ceremonies") @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class PasskeyCeremony {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 @Column(nullable=false) private UUID userId;
 @Column(nullable=false) private UUID sessionId;
 @Column(nullable=false) private String kind;
 @Column(length=500) private String action;
 @Column(nullable=false,columnDefinition="TEXT") private String optionsJson;
 private LocalDateTime expiresAt;
 private boolean used;
}
