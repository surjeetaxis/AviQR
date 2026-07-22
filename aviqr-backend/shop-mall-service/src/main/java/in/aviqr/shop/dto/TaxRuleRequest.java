package in.aviqr.shop.dto;

import in.aviqr.shop.entity.TaxRuleType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class TaxRuleRequest {
    @NotBlank private String name;
    @NotNull private TaxRuleType type;
    private String state;
    private String city;
    private String outletType;
    private String category;
    @NotNull @DecimalMin(value = "0.0") private BigDecimal taxPercent;
    private Integer priority;
}
