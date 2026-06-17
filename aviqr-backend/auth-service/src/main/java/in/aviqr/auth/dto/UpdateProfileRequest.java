package in.aviqr.auth.dto;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    String name;
    String phone;
    String preferredLanguage;
    String fcmToken;
    String avatar;
}
