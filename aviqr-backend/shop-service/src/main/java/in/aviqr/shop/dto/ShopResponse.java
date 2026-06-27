package in.aviqr.shop.dto;
import in.aviqr.shop.entity.ShopStatus;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ShopResponse {
    UUID id; String name; String tagline; String ownerId; String phone; String email;
    String address; String city; String logoUrl; ShopStatus status;
    Integer minOrderAmount; Integer tableCount; String subscriptionPlan;
    LocalDateTime createdAt;
}