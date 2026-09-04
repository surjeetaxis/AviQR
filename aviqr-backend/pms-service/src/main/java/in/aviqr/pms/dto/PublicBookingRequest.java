package in.aviqr.pms.dto;

import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

/** A prospective guest's self-service booking from the hotel's own direct
 *  booking-engine page — always a single room, no group/agent (those are
 *  staff-entered concepts). Becomes a DIRECT-source Reservation. */
@Data
public class PublicBookingRequest {
    private String guestName;
    private String guestPhone;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Integer adults;
    private Integer children;
    private UUID roomTypeId;
    private UUID ratePlanId;
}
