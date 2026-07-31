package in.aviqr.auth.dto;
import in.aviqr.auth.entity.Platform;
import in.aviqr.auth.entity.UserRole;
import in.aviqr.auth.entity.UserStatus;
import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data @Builder
public class AuthResponse {
    String accessToken;
    String refreshToken;
    String tokenType;
    Long expiresIn;
    UUID userId;
    String name;
    String email;
    String phone;
    UserRole role;
    String shopId;
    String avatar;
    String preferredLanguage;
    boolean isOnboardingComplete;

    // Session/device visibility, surfaced directly on login so clients (and
    // support/admin looking at a user's account) can see which session this is.
    UUID sessionId;
    Platform platform;
    UserStatus accountStatus;
    Boolean emailVerified;
    Boolean phoneVerified;
}
