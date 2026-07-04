package in.aviqr.notification.dto;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.UUID;

@Data
public class ReviewRequest {
    @NotBlank private String shopId;
    private UUID menuItemId;
    private UUID orderId;
    @NotBlank private String customerName;
    @NotNull @Min(1) @Max(5) private Integer rating;
    private String comment;
}
