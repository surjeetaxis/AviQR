package in.aviqr.menu.dto;
import lombok.Data;
import java.math.BigDecimal;

// Mirrors a subset of shop-service's ShopResponse — the fields the public
// customer menu page (CustomerMenu.jsx) shows in its banner.
@Data
public class ShopDetailsResponse {
    private String name;
    private String tagline;
    private String phone;
    private String address;
    private String logoUrl;
    private BigDecimal rating;
    private Integer ratingCount;
}
