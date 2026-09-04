package in.aviqr.pms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** What the direct booking engine shows a prospective guest — a room type with
 *  its bookable rate plans. Deliberately narrower than the staff-facing RoomType/
 *  RatePlan entities (no internal ids beyond what booking needs, no inactive plans). */
@Data @AllArgsConstructor
public class PublicRoomTypeDto {
    private UUID roomTypeId;
    private String name;
    private String description;
    private Integer maxOccupancy;
    private List<RatePlanOption> ratePlans;

    @Data @AllArgsConstructor
    public static class RatePlanOption {
        private UUID ratePlanId;
        private String name;
        private BigDecimal baseRate;
        private String mealPlan;
        private String cancellationPolicy;
    }
}
