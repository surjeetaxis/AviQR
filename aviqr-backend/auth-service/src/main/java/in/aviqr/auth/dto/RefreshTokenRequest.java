package in.aviqr.auth.dto;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RefreshTokenRequest {
    @NotBlank String refreshToken;
}
