package in.aviqr.auth.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 500)
    private String token;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Builder.Default
    private Boolean revoked = false;

    private LocalDateTime createdAt;

    // This row doubles as the session record: one per login, carrying the
    // device/platform info captured at login time so support/admin can see
    // and revoke a user's sessions per platform (web/android/ios).
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Platform platform = Platform.UNKNOWN;

    private String deviceId;
    private String deviceModel;
    private String appVersion;
    private String ipAddress;
    private String userAgent;
    private LocalDateTime lastActiveAt;
    private LocalDateTime revokedAt;
    private String revokedBy;
}
