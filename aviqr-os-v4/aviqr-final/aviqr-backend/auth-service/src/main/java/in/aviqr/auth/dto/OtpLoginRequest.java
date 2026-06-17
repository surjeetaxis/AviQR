package in.aviqr.auth.dto;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class OtpLoginRequest {
    @Pattern(regexp = "^[6-9]\\d{9}$") String phone;
    @NotBlank String otp;
}
