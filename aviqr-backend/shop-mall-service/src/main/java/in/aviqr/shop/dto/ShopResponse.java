package in.aviqr.shop.dto;
import in.aviqr.shop.entity.ShopStatus;
import in.aviqr.shop.entity.SubscriptionStatus;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ShopResponse {
    UUID id; String name; String tagline; String ownerId; String phone; String email;
    String address; String city; String state; String zone; String pincode; String logoUrl; String gstin; ShopStatus status;
    Double latitude; Double longitude;
    Integer minOrderAmount; Integer tableCount; String subscriptionPlan;
    SubscriptionStatus subscriptionStatus; LocalDateTime trialEndsAt; LocalDateTime planStartedAt; LocalDateTime cancelRequestedAt;
    BigDecimal rating; Integer ratingCount;
    LocalDateTime createdAt;
}