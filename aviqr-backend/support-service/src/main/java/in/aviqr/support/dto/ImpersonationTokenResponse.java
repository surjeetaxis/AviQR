package in.aviqr.support.dto;

import lombok.Data;

// Mirrors auth-service's in.aviqr.auth.dto.ImpersonationTokenResponse — no shared
// module between services in this codebase, so each side keeps its own copy of
// the internal-call DTO shape (same convention as ApiResponse itself).
@Data
public class ImpersonationTokenResponse {
    String accessToken;
    Long expiresIn;
    String sessionId;
    String targetUserId;
    String targetUserName;
    String targetUserRole;
}
