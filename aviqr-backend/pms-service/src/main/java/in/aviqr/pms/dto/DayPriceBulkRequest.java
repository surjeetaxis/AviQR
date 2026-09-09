package in.aviqr.pms.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Bulk day-price update: the same field set as DayPriceUpdateRequest, applied to every
 *  date in `dates` in one call — the Inventory & Rates Calendar's "apply to selected
 *  dates" action, so setting a weekend rate across a month doesn't take one click per day.
 *  Any field left null is left untouched for every date, same merge semantics as the
 *  single-date save. */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DayPriceBulkRequest {
    private List<LocalDate> dates;
    private BigDecimal price;
    private Integer minStay;
    private Integer maxStay;
    private Boolean closedToArrival;
    private Boolean closedToDeparture;
    private Boolean stopSell;
    private Boolean autoSync;
}
