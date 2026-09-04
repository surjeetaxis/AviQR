package in.aviqr.pms.service;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.NightAuditReport;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.entity.ReservationStatus;
import in.aviqr.pms.entity.RoomReservation;
import in.aviqr.pms.repository.ReservationRepository;
import in.aviqr.pms.repository.RoomReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** End-of-day rollup: occupancy, ADR/RevPAR, arrivals/departures/no-shows/cancellations
 *  for one hotel on one date. Mirrors CRS's reservation-statistics reporting, scoped
 *  down to computation only — no day-closing/lock step, since that would touch every
 *  other flow's notion of "today" for comparatively little value here. */
@Service @RequiredArgsConstructor
public class NightAuditService {

    private final ReservationRepository reservationRepo;
    private final RoomReservationRepository roomReservationRepo;
    private final HotelServiceClient hotelServiceClient;

    public NightAuditReport forDate(UUID hotelId, LocalDate date) {
        return forDate(hotelId, date, hotelServiceClient.getRooms(hotelId).size());
    }

    private NightAuditReport forDate(UUID hotelId, LocalDate date, int totalRooms) {
        List<RoomReservation> occupied = roomReservationRepo.findOccupiedOnDate(hotelId, date);
        int roomsSold = occupied.size();
        BigDecimal roomRevenue = occupied.stream()
            .map(RoomReservation::getRatePerNight)
            .filter(java.util.Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Reservation> dueToArrive = reservationRepo.findByHotelIdAndCheckInDate(hotelId, date);
        int arrivals = (int) dueToArrive.stream()
            .filter(r -> r.getStatus() == ReservationStatus.CHECKED_IN || r.getStatus() == ReservationStatus.CHECKED_OUT)
            .count();
        int noShows = (int) dueToArrive.stream().filter(r -> r.getStatus() == ReservationStatus.NO_SHOW).count();
        int cancellations = (int) dueToArrive.stream().filter(r -> r.getStatus() == ReservationStatus.CANCELLED).count();

        List<Reservation> dueToDepart = reservationRepo.findByHotelIdAndCheckOutDate(hotelId, date);
        int departures = (int) dueToDepart.stream().filter(r -> r.getStatus() == ReservationStatus.CHECKED_OUT).count();

        BigDecimal occupancyPercent = totalRooms > 0
            ? BigDecimal.valueOf(roomsSold).multiply(BigDecimal.valueOf(100)).divide(BigDecimal.valueOf(totalRooms), 1, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;
        BigDecimal adr = roomsSold > 0
            ? roomRevenue.divide(BigDecimal.valueOf(roomsSold), 2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;
        BigDecimal revPar = totalRooms > 0
            ? roomRevenue.divide(BigDecimal.valueOf(totalRooms), 2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        return NightAuditReport.builder()
            .date(date).totalRooms(totalRooms).roomsSold(roomsSold).roomsVacant(Math.max(totalRooms - roomsSold, 0))
            .occupancyPercent(occupancyPercent).roomRevenue(roomRevenue).adr(adr).revPar(revPar)
            .arrivals(arrivals).departures(departures).noShows(noShows).cancellations(cancellations)
            .build();
    }

    public List<NightAuditReport> forRange(UUID hotelId, LocalDate from, LocalDate to) {
        int totalRooms = hotelServiceClient.getRooms(hotelId).size();
        List<NightAuditReport> reports = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            reports.add(forDate(hotelId, d, totalRooms));
        }
        return reports;
    }
}
