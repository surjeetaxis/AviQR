package in.aviqr.pms.service;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.PricingSuggestion;
import in.aviqr.pms.entity.DynamicPricingConfig;
import in.aviqr.pms.entity.RatePlan;
import in.aviqr.pms.entity.RoomType;
import in.aviqr.pms.repository.DynamicPricingConfigRepository;
import in.aviqr.pms.repository.RatePlanRepository;
import in.aviqr.pms.repository.RoomReservationRepository;
import in.aviqr.pms.repository.RoomTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.UUID;

/** Occupancy-threshold surge/discount suggestions — staff reviews and applies via
 *  the existing day-price endpoint rather than this silently rewriting rates. */
@Service @RequiredArgsConstructor
public class DynamicPricingService {

    private final DynamicPricingConfigRepository configRepo;
    private final RoomTypeRepository roomTypeRepo;
    private final RatePlanRepository ratePlanRepo;
    private final RoomReservationRepository roomReservationRepo;
    private final HotelServiceClient hotelServiceClient;

    public DynamicPricingConfig getConfig(UUID hotelId) {
        return configRepo.findByHotelId(hotelId)
            .orElseGet(() -> configRepo.save(DynamicPricingConfig.builder().hotelId(hotelId).build()));
    }

    public DynamicPricingConfig updateConfig(UUID hotelId, DynamicPricingConfig req) {
        DynamicPricingConfig config = getConfig(hotelId);
        if (req.getHighOccupancyThreshold() != null) config.setHighOccupancyThreshold(req.getHighOccupancyThreshold());
        if (req.getHighOccupancySurchargePercent() != null) config.setHighOccupancySurchargePercent(req.getHighOccupancySurchargePercent());
        if (req.getLowOccupancyThreshold() != null) config.setLowOccupancyThreshold(req.getLowOccupancyThreshold());
        if (req.getLowOccupancyDiscountPercent() != null) config.setLowOccupancyDiscountPercent(req.getLowOccupancyDiscountPercent());
        if (req.getActive() != null) config.setActive(req.getActive());
        return configRepo.save(config);
    }

    public PricingSuggestion suggest(UUID hotelId, UUID roomTypeId, UUID ratePlanId, LocalDate date) {
        RoomType roomType = roomTypeRepo.findById(roomTypeId)
            .orElseThrow(() -> new RuntimeException("Room type not found: " + roomTypeId));
        RatePlan ratePlan = ratePlanRepo.findById(ratePlanId)
            .orElseThrow(() -> new RuntimeException("Rate plan not found: " + ratePlanId));

        long totalRooms = hotelServiceClient.getRooms(hotelId).stream()
            .filter(r -> roomType.getName().equalsIgnoreCase(r.getRoomType())).count();
        long occupied = roomReservationRepo.findOccupiedOnDate(hotelId, date).stream()
            .filter(rr -> roomTypeId.equals(rr.getRoomTypeId())).count();
        BigDecimal occupancyPercent = totalRooms > 0
            ? BigDecimal.valueOf(occupied * 100.0 / totalRooms).setScale(1, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        DynamicPricingConfig config = getConfig(hotelId);
        BigDecimal baseRate = ratePlan.getBaseRate();
        BigDecimal suggested = baseRate;
        String reason = "Standard rate — occupancy within the normal range";

        if (Boolean.TRUE.equals(config.getActive()) && occupancyPercent.compareTo(config.getHighOccupancyThreshold()) >= 0) {
            BigDecimal multiplier = BigDecimal.ONE.add(config.getHighOccupancySurchargePercent().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
            suggested = baseRate.multiply(multiplier).setScale(2, RoundingMode.HALF_UP);
            reason = "High demand (" + occupancyPercent + "% occupied) — +" + config.getHighOccupancySurchargePercent() + "% surge suggested";
        } else if (Boolean.TRUE.equals(config.getActive()) && occupancyPercent.compareTo(config.getLowOccupancyThreshold()) <= 0) {
            BigDecimal multiplier = BigDecimal.ONE.subtract(config.getLowOccupancyDiscountPercent().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
            suggested = baseRate.multiply(multiplier).setScale(2, RoundingMode.HALF_UP);
            reason = "Low demand (" + occupancyPercent + "% occupied) — -" + config.getLowOccupancyDiscountPercent() + "% discount suggested";
        }

        return new PricingSuggestion(baseRate, occupancyPercent, suggested, reason);
    }
}
