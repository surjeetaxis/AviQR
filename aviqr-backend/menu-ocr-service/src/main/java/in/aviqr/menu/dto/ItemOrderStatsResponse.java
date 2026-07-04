package in.aviqr.menu.dto;
import lombok.Data;

// Mirrors order-service's internal ItemOrderStats DTO shape
@Data
public class ItemOrderStatsResponse {
    private String menuItemId;
    private long timesOrdered;
    private long totalQuantity;
}
