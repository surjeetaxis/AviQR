package in.aviqr.menu.dto;
import lombok.Data;
import java.math.BigDecimal;

// Mirrors review-service's internal RatingSummary DTO shape
@Data
public class RatingSummaryResponse {
    private BigDecimal averageRating;
    private Long ratingCount;
}
