package in.aviqr.auth.dto;

import in.aviqr.auth.entity.Platform;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder
public class SessionDto {
    UUID id;
    Platform platform;
    String deviceId;
    String deviceModel;
    String appVersion;
    String ipAddress;
    String userAgent;
    LocalDateTime createdAt;
    LocalDateTime lastActiveAt;
    LocalDateTime expiresAt;
    Boolean revoked;
    LocalDateTime revokedAt;
    String revokedBy;
}
