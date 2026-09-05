package in.aviqr.pms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.math.BigDecimal;

@Data @AllArgsConstructor
public class PricingSuggestion {
    private BigDecimal baseRate;
    private BigDecimal occupancyPercent;
    private BigDecimal suggestedPrice;
    private String reason;
}
