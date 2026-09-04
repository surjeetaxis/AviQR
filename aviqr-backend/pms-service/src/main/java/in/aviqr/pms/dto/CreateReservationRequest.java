package in.aviqr.pms.dto;

import in.aviqr.pms.entity.ReservationSource;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class CreateReservationRequest {
    private UUID hotelId;
    private UUID guestId;
    // Set to attach this booking as a member of an existing ReservationGroup.
    private UUID groupId;
    // Set when a travel agent sourced this booking. commissionPercentOverride lets a
    // one-off deal differ from the agent's stored default rate; null uses that default.
    private UUID agentId;
    private java.math.BigDecimal commissionPercentOverride;
    private String guestName;
    private String guestPhone;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Integer adults;
    private Integer children;
    private ReservationSource source;
    private String notes;
    private List<RoomBooking> rooms;

    @Data
    public static class RoomBooking {
        private UUID roomTypeId;
        private UUID ratePlanId;
    }
}
