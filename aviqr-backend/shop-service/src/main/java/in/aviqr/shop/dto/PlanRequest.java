package in.aviqr.shop.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PlanRequest {
    @NotBlank private String planKey;
    @NotBlank private String label;
    private String vertical;
    @NotNull private Integer price;
    private String features;
    private Integer sortOrder;
}
