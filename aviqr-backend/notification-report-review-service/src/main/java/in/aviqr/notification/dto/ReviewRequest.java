package in.aviqr.notification.dto;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.UUID;

@Data
public class ReviewRequest {
    private String shopId;
    private UUID menuItemId;
    private UUID orderId;
    private String hotelId;
    private UUID reservationId;
    @NotBlank private String customerName;
    @NotNull @Min(1) @Max(5) private Integer rating;
    private String comment;
}
