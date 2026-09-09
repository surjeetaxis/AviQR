package in.aviqr.pms.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/** RateChangeLog enriched with the acting user's name/email, resolved via auth-service —
 *  changedBy alone is a raw user UUID with no name anywhere in pms-service's own data,
 *  the same gap HotelAccessResponse closed for the Hotel Staff list. */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RateChangeLogResponse {
    private UUID id;
    private UUID hotelId;
    private UUID roomTypeId;
    private UUID ratePlanId;
    private LocalDate date;
    private String field;
    private String oldValue;
    private String newValue;
    private String changedBy;
    private String changedByName;
    private String changedByEmail;
    private LocalDateTime changedAt;
}
