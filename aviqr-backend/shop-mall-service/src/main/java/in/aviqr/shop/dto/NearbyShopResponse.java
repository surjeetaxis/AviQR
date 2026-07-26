package in.aviqr.shop.dto;
import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class NearbyShopResponse {
    UUID id; String name; String tagline; String city; String logoUrl;
    BigDecimal rating; Integer ratingCount;
    Double latitude; Double longitude; Double distanceKm;
}
