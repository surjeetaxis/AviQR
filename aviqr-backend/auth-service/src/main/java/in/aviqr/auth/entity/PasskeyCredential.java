package in.aviqr.auth.entity;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
import java.time.LocalDateTime;
@Entity @Table(name="passkey_credentials") @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class PasskeyCredential {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 @Column(nullable=false) private UUID userId;
 @Column(nullable=false,unique=true,length=1400) private String credentialId;
 @Column(nullable=false,columnDefinition="TEXT") private String publicKeyCose;
 private long signatureCount;
 @Column(nullable=false) private String name;
 @Builder.Default private boolean active=true;
 private LocalDateTime createdAt;
 private LocalDateTime lastUsedAt;
}
