package in.aviqr.auth.dto;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class OtpLoginRequest {
    @Email @NotBlank String email;
    @NotBlank String otp;
}
