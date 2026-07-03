package in.aviqr.shop.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class OfferRequest {
    @NotBlank private String title;
    private String description;
    private String code;
    @NotNull private Integer discountPercent;
    private String applicablePlans;
    private LocalDateTime startsAt;
    private LocalDateTime endsAt;
}
