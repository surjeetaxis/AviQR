package in.aviqr.shop.dto;
import lombok.Data;
import java.math.BigDecimal;

// Mirrors order-service's internal ShopOrderStats DTO shape
@Data
public class ShopOrderStatsResponse {
    private String shopId;
    private long completedCount;
    private long cancelledCount;
    private long rejectedCount;
    private BigDecimal completionRate;
    private BigDecimal totalRevenue;
}
