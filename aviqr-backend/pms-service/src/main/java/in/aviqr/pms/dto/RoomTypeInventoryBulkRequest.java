package in.aviqr.pms.dto;

import lombok.*;
import java.time.LocalDate;
import java.util.List;

/** Bulk allotment update — same idea as DayPriceBulkRequest but for the sellable-room
 *  cap: one allotment value applied to every date in `dates`. */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RoomTypeInventoryBulkRequest {
    private List<LocalDate> dates;
    private Integer allotment;
    private Boolean autoSync;
}
