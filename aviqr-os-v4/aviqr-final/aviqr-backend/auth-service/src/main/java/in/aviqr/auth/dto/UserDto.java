package in.aviqr.auth.dto;
import in.aviqr.auth.entity.UserRole;
import in.aviqr.auth.entity.UserStatus;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class UserDto {
    UUID id;
    String name;
    String email;
    String phone;
    UserRole role;
    UserStatus status;
    String avatar;
    String shopId;
    Boolean emailVerified;
    Boolean phoneVerified;
    String preferredLanguage;
    LocalDateTime createdAt;
    LocalDateTime lastLoginAt;
}
