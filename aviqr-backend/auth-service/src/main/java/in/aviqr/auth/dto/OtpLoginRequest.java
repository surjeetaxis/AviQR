package in.aviqr.auth.dto;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class OtpLoginRequest {
    @Email @NotBlank String email;
    @NotBlank @Pattern(regexp="^[0-9]{6}$") String otp;
    String challengeId;
    boolean trustDevice;
}
