package in.aviqr.order.dto;
import lombok.*;
import java.math.BigDecimal;

@Data @AllArgsConstructor @NoArgsConstructor
public class ShopOrderStats {
    private String shopId;
    private long completedCount;
    private long cancelledCount;
    private long rejectedCount;
    private BigDecimal completionRate;
    private BigDecimal totalRevenue;
}
