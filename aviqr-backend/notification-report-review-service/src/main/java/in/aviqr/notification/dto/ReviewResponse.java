package in.aviqr.notification.dto;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ReviewResponse {
    private UUID id;
    private String shopId;
    private UUID menuItemId;
    private UUID orderId;
    private String customerId;
    private String customerName;
    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;
}
