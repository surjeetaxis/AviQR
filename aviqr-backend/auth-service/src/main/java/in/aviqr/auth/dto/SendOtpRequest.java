package in.aviqr.auth.dto;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class SendOtpRequest {
    @Pattern(regexp = "^[6-9]\\d{9}$") @NotBlank String phone;
}
