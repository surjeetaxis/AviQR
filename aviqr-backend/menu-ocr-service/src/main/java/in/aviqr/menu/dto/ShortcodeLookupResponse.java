package in.aviqr.menu.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Data @AllArgsConstructor @NoArgsConstructor @Builder
public class ShortcodeLookupResponse {
    private UUID itemId;
    private String itemName;
    private BigDecimal price;
    private Boolean veg;
    private UUID variantId;
    private String variantName;
}
