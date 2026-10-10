package in.aviqr.pms.service;

import in.aviqr.pms.dto.PublicDeal;
import in.aviqr.pms.entity.Deal;
import in.aviqr.pms.repository.DealRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Picks the deal that saves a stay the most. */
@Service @RequiredArgsConstructor
public class DealService {
    static final ZoneId HOTEL_ZONE = ZoneId.of("Asia/Kolkata");
    private final DealRepository dealRepo;

    public List<PublicDeal> live(UUID hotelId) {
        LocalDate today = LocalDate.now(HOTEL_ZONE);
        return dealRepo.findByHotelIdAndActiveTrue(hotelId).stream().filter(d -> d.live(today)).map(d -> view(d, null)).toList();
    }

    public Optional<PublicDeal> best(UUID hotelId, BigDecimal roomTotal, LocalDate checkIn, LocalDate checkOut) {
        if (roomTotal == null || roomTotal.signum() <= 0) return Optional.empty();
        LocalDate today = LocalDate.now(HOTEL_ZONE);
        return dealRepo.findByHotelIdAndActiveTrue(hotelId).stream()
            .filter(d -> d.appliesTo(checkIn, checkOut, today))
            .max(Comparator.comparing((Deal d) -> d.discountOn(roomTotal)))
            .filter(d -> d.discountOn(roomTotal).signum() > 0)
            .map(d -> view(d, d.discountOn(roomTotal)));
    }

    static PublicDeal view(Deal d, BigDecimal discount) {
        return new PublicDeal(d.getId(), d.getName(), d.getDescription(), d.getValueType().name(), d.getValue(), d.getStayFrom(), d.getStayTo(),
            d.getMinNights(), d.getMinDaysAhead(), d.getMaxDaysAhead(), discount);
    }
}
