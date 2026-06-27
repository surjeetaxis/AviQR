package in.aviqr.menu.dto;
import lombok.Data;
import java.math.BigDecimal;

// Mirrors a subset of shop-service's ShopResponse — only the Seller Tier fields
// Product Ranking needs (extra JSON properties are ignored by Jackson by default).
@Data
public class ShopTierResponse {
    private String tier;
    private BigDecimal rating;
}
