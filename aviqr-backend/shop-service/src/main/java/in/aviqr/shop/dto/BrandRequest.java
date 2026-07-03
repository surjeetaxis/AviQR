package in.aviqr.shop.dto;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BrandRequest {
    @NotBlank private String name;
    private String logoUrl;
    private String city;
}
