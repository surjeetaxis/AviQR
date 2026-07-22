package in.aviqr.shop.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CustomerNotesRequest {
    @NotBlank private String phone;
    private String notes;
}
