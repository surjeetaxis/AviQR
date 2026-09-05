package in.aviqr.pms.service;

import in.aviqr.pms.entity.DayPrice;
import in.aviqr.pms.entity.RatePlan;
import in.aviqr.pms.repository.DayPriceRepository;
import in.aviqr.pms.repository.RatePlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class RatePlanService {

    private final RatePlanRepository ratePlanRepo;
    private final DayPriceRepository dayPriceRepo;

    public BigDecimal rateForNight(UUID ratePlanId, LocalDate date) {
        return dayPriceRepo.findByRatePlanIdAndDate(ratePlanId, date)
            .map(DayPrice::getPrice)
            .orElseGet(() -> ratePlanRepo.findById(ratePlanId)
                .map(RatePlan::getBaseRate)
                .orElseThrow(() -> new RuntimeException("Rate plan not found: " + ratePlanId)));
    }

    /** Sum of per-night rates for [checkIn, checkOut) — checkout day itself isn't charged. */
    public BigDecimal totalForStay(UUID ratePlanId, LocalDate checkIn, LocalDate checkOut) {
        BigDecimal total = BigDecimal.ZERO;
        for (LocalDate d = checkIn; d.isBefore(checkOut); d = d.plusDays(1)) {
            total = total.add(rateForNight(ratePlanId, d));
        }
        return total;
    }

    /** Same ARI convention every channel manager/OTA uses: min/max length-of-stay and
     *  closed-to-arrival are keyed off the arrival date; closed-to-departure off the
     *  departure date. Throws with a guest-facing reason if the requested stay violates
     *  a restriction set on either date — not enforced for channel-sourced bookings
     *  (the OTA already applied its own copy of these restrictions before confirming). */
    public void validateStay(UUID ratePlanId, LocalDate checkIn, LocalDate checkOut) {
        long nights = java.time.temporal.ChronoUnit.DAYS.between(checkIn, checkOut);
        dayPriceRepo.findByRatePlanIdAndDate(ratePlanId, checkIn).ifPresent(dp -> {
            if (Boolean.TRUE.equals(dp.getClosedToArrival()))
                throw new RuntimeException("Arrivals are closed on " + checkIn + " for this rate plan");
            if (dp.getMinStay() != null && nights < dp.getMinStay())
                throw new RuntimeException("Minimum stay for arrival on " + checkIn + " is " + dp.getMinStay() + " night(s)");
            if (dp.getMaxStay() != null && nights > dp.getMaxStay())
                throw new RuntimeException("Maximum stay for arrival on " + checkIn + " is " + dp.getMaxStay() + " night(s)");
        });
        dayPriceRepo.findByRatePlanIdAndDate(ratePlanId, checkOut).ifPresent(dp -> {
            if (Boolean.TRUE.equals(dp.getClosedToDeparture()))
                throw new RuntimeException("Departures are closed on " + checkOut + " for this rate plan");
        });
    }
}
