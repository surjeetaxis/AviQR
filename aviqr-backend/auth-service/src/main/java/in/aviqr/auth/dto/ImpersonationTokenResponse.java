package in.aviqr.auth.dto;

import in.aviqr.auth.entity.UserRole;
import lombok.Builder;
import lombok.Data;
import java.util.UUID;

// Returned by the internal impersonation-token-minting endpoint to support-service.
@Data @Builder
public class ImpersonationTokenResponse {
    String accessToken;
    Long expiresIn;
    UUID sessionId;
    UUID targetUserId;
    String targetUserName;
    UserRole targetUserRole;
}
