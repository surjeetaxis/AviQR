package in.aviqr.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

// Returned by the internal nearby-customers lookup used by shop-mall-service's
// CampaignService to build a NEARBY-audience promotion campaign.
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class NearbyCustomerResponse {
    UUID userId;
    String name;
    String email;
    String phone;
    double distanceKm;
}
