package in.aviqr.auth.dto;

import in.aviqr.auth.entity.UserRole;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank String name;
    @Email @NotBlank String email;
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Invalid Indian mobile number") String phone;
    @Size(min = 8) String password;
    @NotNull UserRole role;
    String shopName;
    String hotelName;
    String mallName;
    String brandName;
    String preferredLanguage;
}
