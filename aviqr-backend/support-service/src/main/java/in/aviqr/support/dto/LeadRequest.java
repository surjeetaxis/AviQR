package in.aviqr.support.dto;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LeadRequest {
    @NotBlank private String businessName;
    private String contactName;
    private String phone;
    private String email;
    private String city;
    @NotBlank private String consentBasis;
    private String notes;
    private String assignedTo;
}
