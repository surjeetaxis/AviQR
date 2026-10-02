package in.aviqr.auth.dto;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ChangePasswordRequest {
    @NotBlank String currentPassword;
    @Size(min = 12, max = 128) @NotBlank String newPassword;
}
