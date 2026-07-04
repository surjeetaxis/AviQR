package in.aviqr.notification.dto;
import lombok.*;
import java.math.BigDecimal;

@Data @AllArgsConstructor @NoArgsConstructor
public class RatingSummary {
    private BigDecimal averageRating;
    private Long ratingCount;
}
