package in.aviqr.auth.dto;
import in.aviqr.auth.entity.UserRole;
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
}
