package in.aviqr.pms.dto;

import lombok.*;
import java.time.LocalDate;

/** Request body for a single-date allotment save — see DayPriceUpdateRequest for why
 *  this isn't bound directly to the RoomTypeInventory entity. */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RoomTypeInventoryUpdateRequest {
    private LocalDate date;
    private Integer allotment;
    private Boolean autoSync;
}
