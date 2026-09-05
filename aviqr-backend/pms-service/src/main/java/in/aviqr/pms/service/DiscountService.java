package in.aviqr.pms.service;

import in.aviqr.pms.entity.DiscountPackage;
import in.aviqr.pms.entity.FolioCharge;
import in.aviqr.pms.entity.FolioChargeType;
import in.aviqr.pms.entity.ValueType;
import in.aviqr.pms.repository.DiscountPackageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class DiscountService {

    private final DiscountPackageRepository discountRepo;
    private final FolioService folioService;

    public DiscountPackage create(DiscountPackage req) {
        req.setId(null);
        req.setActive(true);
        return discountRepo.save(req);
    }

    public List<DiscountPackage> listForHotel(UUID hotelId) {
        return discountRepo.findByHotelId(hotelId);
    }

    public DiscountPackage update(UUID id, DiscountPackage req) {
        DiscountPackage existing = discountRepo.findById(id).orElseThrow(() -> new RuntimeException("Discount package not found: " + id));
        existing.setName(req.getName());
        existing.setValueType(req.getValueType());
        existing.setValue(req.getValue());
        if (req.getActive() != null) existing.setActive(req.getActive());
        return discountRepo.save(existing);
    }

    public DiscountPackage get(UUID id) {
        return discountRepo.findById(id).orElseThrow(() -> new RuntimeException("Discount package not found: " + id));
    }

    /** Posts a negative FolioCharge against the reservation — PERCENT is computed
     *  against room revenue already on the folio (see FolioService.roomRevenue). */
    public FolioCharge applyToReservation(UUID reservationId, UUID discountPackageId) {
        DiscountPackage discount = get(discountPackageId);
        BigDecimal roomRevenue = folioService.roomRevenue(reservationId);
        BigDecimal amount = discount.getValueType() == ValueType.FIXED
            ? discount.getValue()
            : roomRevenue.multiply(discount.getValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        return folioService.addCharge(reservationId, null, FolioChargeType.DISCOUNT, discount.getName(), amount.negate());
    }
}
