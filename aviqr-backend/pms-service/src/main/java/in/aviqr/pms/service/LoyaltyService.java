package in.aviqr.pms.service;

import in.aviqr.pms.entity.Guest;
import in.aviqr.pms.entity.LoyaltyProgramConfig;
import in.aviqr.pms.repository.GuestRepository;
import in.aviqr.pms.repository.LoyaltyProgramConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class LoyaltyService {

    private final LoyaltyProgramConfigRepository configRepo;
    private final GuestRepository guestRepo;

    public LoyaltyProgramConfig getConfig(UUID hotelId) {
        return configRepo.findByHotelId(hotelId)
            .orElseGet(() -> configRepo.save(LoyaltyProgramConfig.builder().hotelId(hotelId).build()));
    }

    public LoyaltyProgramConfig updateConfig(UUID hotelId, BigDecimal earnRatePercent, BigDecimal redemptionValue, Boolean active) {
        LoyaltyProgramConfig config = getConfig(hotelId);
        if (earnRatePercent != null) config.setEarnRatePercent(earnRatePercent);
        if (redemptionValue != null) config.setRedemptionValue(redemptionValue);
        if (active != null) config.setActive(active);
        return configRepo.save(config);
    }

    /** Called at checkout — a stay's room revenue earns points at the hotel's
     *  configured rate. Silently a no-op when the reservation has no linked Guest
     *  (e.g. a walk-in booked without a phone) or the program is off. */
    @Transactional
    public void earnPointsForStay(UUID hotelId, UUID guestId, BigDecimal roomRevenue) {
        if (guestId == null || roomRevenue == null || roomRevenue.signum() <= 0) return;
        LoyaltyProgramConfig config = getConfig(hotelId);
        if (!Boolean.TRUE.equals(config.getActive())) return;
        int points = roomRevenue.multiply(config.getEarnRatePercent())
            .divide(BigDecimal.valueOf(100), 0, RoundingMode.DOWN).intValue();
        if (points <= 0) return;
        Guest guest = guestRepo.findById(guestId).orElse(null);
        if (guest == null) return;
        guest.setLoyaltyPoints((guest.getLoyaltyPoints() == null ? 0 : guest.getLoyaltyPoints()) + points);
        guestRepo.save(guest);
    }

    /** Redeems enough points to cover {@code amount} rupees on a folio, at the
     *  hotel's configured redemption value — the folio-payment-time counterpart
     *  to earnPointsForStay. */
    @Transactional
    public void redeemPoints(UUID hotelId, UUID guestId, BigDecimal amount) {
        if (guestId == null)
            throw new RuntimeException("This reservation has no linked guest profile to redeem loyalty points from");
        Guest guest = guestRepo.findById(guestId)
            .orElseThrow(() -> new RuntimeException("Guest not found: " + guestId));
        LoyaltyProgramConfig config = getConfig(hotelId);
        int pointsNeeded = amount.divide(config.getRedemptionValue(), 0, RoundingMode.CEILING).intValue();
        int balance = guest.getLoyaltyPoints() == null ? 0 : guest.getLoyaltyPoints();
        if (balance < pointsNeeded)
            throw new RuntimeException("Guest only has " + balance + " loyalty points, but " + pointsNeeded + " are needed for ₹" + amount);
        guest.setLoyaltyPoints(balance - pointsNeeded);
        guestRepo.save(guest);
    }
}
