package in.aviqr.order.dto;
import lombok.*;
import java.util.UUID;

@Data @AllArgsConstructor @NoArgsConstructor
public class ItemOrderStats {
    private UUID menuItemId;
    private long timesOrdered;
    private long totalQuantity;
}
