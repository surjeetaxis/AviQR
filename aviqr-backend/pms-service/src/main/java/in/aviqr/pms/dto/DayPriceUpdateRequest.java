package in.aviqr.pms.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Request body for a single-date price/restriction save. Mirrors DayPrice's fields
 *  (kept as a separate DTO rather than binding directly to the entity) so the request
 *  can carry autoSync without adding a persisted column for it. */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DayPriceUpdateRequest {
    private LocalDate date;
    private BigDecimal price;
    private Integer minStay;
    private Integer maxStay;
    private Boolean closedToArrival;
    private Boolean closedToDeparture;
    private Boolean stopSell;
    // When true, pushes this rate plan's room type to every active channel-manager
    // mapping right after saving — see ChannelService.pushForRoomType.
    private Boolean autoSync;
}
