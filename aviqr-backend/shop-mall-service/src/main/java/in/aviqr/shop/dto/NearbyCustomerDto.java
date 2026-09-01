package in.aviqr.shop.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

// Mirrors auth-service's NearbyCustomerResponse — deserialized from the
// GET /api/v1/auth/internal/nearby-customers call in CampaignService.
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class NearbyCustomerDto {
    private String name;
    private String email;
    private String phone;
    private double distanceKm;
}
