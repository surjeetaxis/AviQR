package in.aviqr.pms.service;

import in.aviqr.pms.entity.FolioChargeType;
import in.aviqr.pms.entity.Surcharge;
import in.aviqr.pms.entity.ValueType;
import in.aviqr.pms.repository.SurchargeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class SurchargeService {

    private final SurchargeRepository surchargeRepo;
    private final FolioService folioService;

    public Surcharge create(Surcharge req) {
        req.setId(null);
        req.setActive(true);
        return surchargeRepo.save(req);
    }

    public List<Surcharge> listForHotel(UUID hotelId) {
        return surchargeRepo.findByHotelId(hotelId);
    }

    public Surcharge get(UUID id) {
        return surchargeRepo.findById(id).orElseThrow(() -> new RuntimeException("Surcharge not found: " + id));
    }

    public Surcharge update(UUID id, Surcharge req) {
        Surcharge existing = get(id);
        existing.setName(req.getName());
        existing.setValueType(req.getValueType());
        existing.setValue(req.getValue());
        if (req.getActive() != null) existing.setActive(req.getActive());
        return surchargeRepo.save(existing);
    }

    /** Applied automatically at check-in (see ReservationService.checkIn) — a FIXED
     *  surcharge is a per-night amount (matches CRS's Surcharge.getSurchargeForReservationDays);
     *  a PERCENT one is a percentage of the stay's total room revenue. */
    public void applyAllToReservation(UUID hotelId, UUID reservationId, BigDecimal totalRoomRevenue, long nights) {
        for (Surcharge s : surchargeRepo.findByHotelIdAndActiveTrue(hotelId)) {
            BigDecimal amount = s.getValueType() == ValueType.FIXED
                ? s.getValue().multiply(BigDecimal.valueOf(nights))
                : totalRoomRevenue.multiply(s.getValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            folioService.addCharge(reservationId, null, FolioChargeType.SURCHARGE, s.getName(), amount);
        }
    }
}
