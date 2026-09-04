package in.aviqr.pms.client;

import lombok.Data;
import java.util.UUID;

/** Mirrors the subset of hotel-service's Hotel fields the scheduled night-audit
 *  email job needs — see HotelServiceClient.getAllActiveHotels(). */
@Data
public class HotelInfoDto {
    private UUID id;
    private String name;
    private String email;
    private Boolean active;
}
