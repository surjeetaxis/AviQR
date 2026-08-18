package in.aviqr.support.dto;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LeadEmailRequest {
    @NotBlank private String subject;
    @NotBlank private String body;
}
