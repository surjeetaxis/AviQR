package in.aviqr.pms.service;

import in.aviqr.pms.entity.AddOn;
import in.aviqr.pms.entity.FolioCharge;
import in.aviqr.pms.entity.FolioChargeType;
import in.aviqr.pms.repository.AddOnRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class AddOnService {

    private final AddOnRepository addOnRepo;
    private final FolioService folioService;

    public AddOn create(AddOn req) {
        req.setId(null);
        req.setActive(true);
        return addOnRepo.save(req);
    }

    public List<AddOn> listForHotel(UUID hotelId) {
        return addOnRepo.findByHotelIdAndActiveTrue(hotelId);
    }

    public AddOn update(UUID id, AddOn req) {
        AddOn existing = addOnRepo.findById(id).orElseThrow(() -> new RuntimeException("Add-on not found: " + id));
        existing.setName(req.getName());
        existing.setDescription(req.getDescription());
        existing.setPrice(req.getPrice());
        if (req.getActive() != null) existing.setActive(req.getActive());
        return addOnRepo.save(existing);
    }

    public AddOn get(UUID id) {
        return addOnRepo.findById(id).orElseThrow(() -> new RuntimeException("Add-on not found: " + id));
    }

    public FolioCharge applyToReservation(UUID reservationId, UUID addOnId, int quantity) {
        AddOn addOn = get(addOnId);
        int qty = Math.max(quantity, 1);
        BigDecimal amount = addOn.getPrice().multiply(BigDecimal.valueOf(qty));
        String description = qty > 1 ? addOn.getName() + " x" + qty : addOn.getName();
        return folioService.addCharge(reservationId, null, FolioChargeType.ADDON, description, amount);
    }
}
