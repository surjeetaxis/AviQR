package in.aviqr.shop.dto;
import lombok.Data;
import java.util.UUID;

// Slim public-facing shop info for the brand's multi-outlet customer preview —
// deliberately excludes phone/email/gstin/etc. that ShopResponse carries, mirroring
// how mall-service's public vendor list doesn't expose shop contact PII either.
@Data
public class PublicShopResponse {
    UUID id; String name; String tagline; String city; String logoUrl;
}
