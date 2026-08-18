package in.aviqr.shop.dto;
import lombok.Data;
import jakarta.validation.constraints.*;

@Data
public class ShopRequest {
    @NotBlank String name;
    String tagline;
    @NotBlank String phone;
    String email;
    String address;
    String city;
    String state;
    String zone;
    String pincode;
    String logoUrl;
    String gstin;
    String subscriptionPlan;
    Integer minOrderAmount;
    Integer tableCount;
    Double latitude;
    Double longitude;
    String referredByCode;
}