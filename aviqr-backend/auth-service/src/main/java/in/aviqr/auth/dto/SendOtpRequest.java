package in.aviqr.auth.dto;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class SendOtpRequest {
    @Email @NotBlank String email;
}
