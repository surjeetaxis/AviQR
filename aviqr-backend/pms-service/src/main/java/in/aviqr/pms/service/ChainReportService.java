package in.aviqr.pms.service;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.client.HotelSummaryDto;
import in.aviqr.pms.dto.ChainNightAuditReport;
import in.aviqr.pms.dto.NightAuditReport;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Reuses NightAuditService per member hotel and sums the results — a chain has no
 *  reservation data of its own, it's purely several hotels' numbers combined. */
@Service @RequiredArgsConstructor
public class ChainReportService {

    private final HotelServiceClient hotelServiceClient;
    private final NightAuditService nightAuditService;

    public ChainNightAuditReport forDate(UUID chainId, LocalDate date, String uid, String role) {
        List<HotelSummaryDto> hotels = hotelServiceClient.getHotelsInChain(chainId, uid, role);

        int totalRooms = 0, roomsSold = 0, arrivals = 0, departures = 0;
        BigDecimal roomRevenue = BigDecimal.ZERO;
        List<ChainNightAuditReport.PerHotel> perHotel = new ArrayList<>();

        for (HotelSummaryDto hotel : hotels) {
            NightAuditReport r = nightAuditService.forDate(hotel.getId(), date);
            totalRooms += r.getTotalRooms();
            roomsSold += r.getRoomsSold();
            arrivals += r.getArrivals();
            departures += r.getDepartures();
            roomRevenue = roomRevenue.add(r.getRoomRevenue());
            perHotel.add(ChainNightAuditReport.PerHotel.builder()
                .hotelId(hotel.getId()).hotelName(hotel.getName()).report(r).build());
        }

        BigDecimal occupancyPercent = totalRooms > 0
            ? BigDecimal.valueOf(roomsSold).multiply(BigDecimal.valueOf(100)).divide(BigDecimal.valueOf(totalRooms), 1, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;
        BigDecimal adr = roomsSold > 0
            ? roomRevenue.divide(BigDecimal.valueOf(roomsSold), 2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;
        BigDecimal revPar = totalRooms > 0
            ? roomRevenue.divide(BigDecimal.valueOf(totalRooms), 2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        return ChainNightAuditReport.builder()
            .date(date).totalRooms(totalRooms).roomsSold(roomsSold)
            .occupancyPercent(occupancyPercent).roomRevenue(roomRevenue).adr(adr).revPar(revPar)
            .arrivals(arrivals).departures(departures).hotels(perHotel)
            .build();
    }
}
