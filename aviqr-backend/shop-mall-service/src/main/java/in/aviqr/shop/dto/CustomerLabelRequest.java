package in.aviqr.shop.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CustomerLabelRequest {
    @NotBlank private String phone;
    @NotBlank private String label;
}
