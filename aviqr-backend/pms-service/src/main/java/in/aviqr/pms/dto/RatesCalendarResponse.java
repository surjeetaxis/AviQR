package in.aviqr.pms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** The combined inventory + rates operational calendar: for each room type, its
 *  per-date allotted/booked/available roll-up (see InventoryRollupService) plus
 *  every one of its rate plans with per-date price and restrictions — the single
 *  view an ARI/channel-manager-style calendar needs, replacing what was previously
 *  spread across the Room Types & Rates date manager and the booking-calendar's
 *  availability row. */
@Data @NoArgsConstructor @AllArgsConstructor
public class RatesCalendarResponse {
    private List<RoomTypeCalendar> roomTypes;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class RoomTypeCalendar {
        private UUID roomTypeId;
        private String roomTypeName;
        private Integer maxOccupancy;
        private int physicalRoomCount;
        private List<InventoryDay> byDate;
        private List<RatePlanCalendar> ratePlans;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class InventoryDay {
        private LocalDate date;
        private int allotted;
        private int booked;
        private int available;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class RatePlanCalendar {
        private UUID ratePlanId;
        private String ratePlanName;
        private BigDecimal baseRate;
        private String mealPlan;
        private Integer occupancy; // null = not occupancy-specific
        private List<RateDay> byDate;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class RateDay {
        private LocalDate date;
        private BigDecimal price;      // resolved: DayPrice override, falling back to the rate plan's baseRate
        private Boolean priceOverridden; // true when a DayPrice row set this date's price explicitly
        private Integer minStay;
        private Integer maxStay;
        private boolean closedToArrival;
        private boolean closedToDeparture;
        private boolean stopSell;
    }
}
