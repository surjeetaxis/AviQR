package in.aviqr.shop.dto;

import in.aviqr.shop.entity.PromotionDiscountType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ShopPromotionRequest {
    @NotBlank private String code;
    @NotBlank private String label;
    private PromotionDiscountType discountType;
    private Double discountValue;
    private String outletType;
    private String category;
    private String state;
    private String city;
    private LocalDateTime startsAt;
    private LocalDateTime endsAt;
}
