package in.aviqr.pms.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Chain-wide rollup of NightAuditReport across every member hotel, plus the
 *  per-hotel breakdown so a chain owner can see which property is driving the
 *  numbers. See ChainReportService. */
@Data @Builder
public class ChainNightAuditReport {
    private LocalDate date;
    private int totalRooms;
    private int roomsSold;
    private BigDecimal occupancyPercent;
    private BigDecimal roomRevenue;
    private BigDecimal adr;
    private BigDecimal revPar;
    private int arrivals;
    private int departures;
    private List<PerHotel> hotels;

    @Data @Builder
    public static class PerHotel {
        private UUID hotelId;
        private String hotelName;
        private NightAuditReport report;
    }
}
