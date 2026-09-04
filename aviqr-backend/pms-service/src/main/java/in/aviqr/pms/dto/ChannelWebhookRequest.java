package in.aviqr.pms.dto;

import in.aviqr.pms.entity.ChannelName;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Shape a channel manager's inbound reservation webhook is expected to send. Real
 *  aggregators (SiteMinder, RateGain, ...) vary in exact field names — an adapter in
 *  front of this endpoint can translate a specific provider's payload into this shape. */
@Data
public class ChannelWebhookRequest {
    private ChannelName channel;
    private String externalPropertyId;
    private String externalBookingId;
    private String guestName;
    private String guestPhone;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Integer adults;
    private Integer children;
    private String notes;
    private List<RoomLine> rooms;

    @Data
    public static class RoomLine {
        private String externalRoomTypeId;
        private BigDecimal ratePerNight;
    }
}
