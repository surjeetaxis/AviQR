package in.aviqr.auth.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

/** Immutable login events and revocable security grants. Never contains passwords, OTPs or raw device tokens. */
@Entity @Table(name="login_security_records", indexes={
    @Index(name="idx_security_email_created", columnList="email,createdAt"),
    @Index(name="idx_security_kind_created", columnList="kind,createdAt")})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoginSecurityRecord {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    private UUID userId;
    @Column(nullable=false) private String email;
    @Column(nullable=false) private String kind;
    @Column(nullable=false) private String status;
    @Column(length=500) private String reason;
    private String actorId;
    private String ipAddress;
    @Column(length=500) private String userAgent;
    private String deviceId;
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String tokenHash;
    private LocalDateTime expiresAt;
    @Column(nullable=false) private LocalDateTime createdAt;
}
