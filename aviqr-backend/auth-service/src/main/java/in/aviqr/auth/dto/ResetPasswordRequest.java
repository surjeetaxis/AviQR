package in.aviqr.auth.dto;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    @Email @NotBlank String email;
    @NotBlank @Pattern(regexp="^[0-9]{6}$") String otp;
    @Size(min = 12, max = 128) @NotBlank String newPassword;
}
