package in.aviqr.pms.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Computed on the fly from existing reservation/room-reservation data — not
 *  persisted, since it's a read-only analytics view, not a source of truth. See
 *  NightAuditService. */
@Data @Builder
public class NightAuditReport {
    private LocalDate date;
    private int totalRooms;
    private int roomsSold;
    private int roomsVacant;
    private BigDecimal occupancyPercent;
    private BigDecimal roomRevenue;
    private BigDecimal adr;     // Average Daily Rate = roomRevenue / roomsSold
    private BigDecimal revPar;  // Revenue Per Available Room = roomRevenue / totalRooms
    private int arrivals;
    private int departures;
    private int noShows;
    private int cancellations;
}
