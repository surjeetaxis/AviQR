package in.aviqr.auth.dto;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    @Email @NotBlank String email;
    @NotBlank String otp;
    @Size(min = 8) @NotBlank String newPassword;
}
