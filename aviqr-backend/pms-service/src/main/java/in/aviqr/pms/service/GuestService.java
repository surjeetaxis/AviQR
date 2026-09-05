package in.aviqr.pms.service;

import in.aviqr.pms.entity.Guest;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.repository.GuestRepository;
import in.aviqr.pms.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class GuestService {

    private final GuestRepository guestRepo;
    private final ReservationRepository reservationRepo;

    /** Phone is the natural per-hotel key for "have we seen this guest before?" — used
     *  by ReservationService so every booking ends up linked to a Guest record without
     *  staff having to manage guests as a separate step. Returns null if no phone was
     *  given (nothing to match or create against). */
    public Guest findOrCreate(UUID hotelId, String name, String phone) {
        if (phone == null || phone.isBlank()) return null;
        List<Guest> existing = guestRepo.findByHotelIdAndPhone(hotelId, phone);
        if (!existing.isEmpty()) {
            Guest g = existing.get(0);
            if (name != null && !name.isBlank() && !name.equals(g.getName())) {
                g.setName(name);
                guestRepo.save(g);
            }
            return g;
        }
        return guestRepo.save(Guest.builder().hotelId(hotelId).name(name).phone(phone).build());
    }

    public Guest get(UUID id) {
        return guestRepo.findById(id).orElseThrow(() -> new RuntimeException("Guest not found: " + id));
    }

    public List<Guest> listForHotel(UUID hotelId, String query) {
        return (query == null || query.isBlank())
            ? guestRepo.findByHotelIdOrderByCreatedAtDesc(hotelId)
            : guestRepo.search(hotelId, query.trim());
    }

    public Guest update(UUID id, Guest req) {
        Guest existing = get(id);
        existing.setName(req.getName());
        existing.setPhone(req.getPhone());
        existing.setEmail(req.getEmail());
        existing.setIdProofType(req.getIdProofType());
        existing.setIdProofNumber(req.getIdProofNumber());
        existing.setAddress(req.getAddress());
        return guestRepo.save(existing);
    }

    public List<Reservation> stayHistory(UUID guestId) {
        return reservationRepo.findByGuestIdOrderByCheckInDateDesc(guestId);
    }

    /** Narrower than update() — only touches ID-proof/address, so a guest submitting
     *  these via the public contactless check-in form (ContactlessCheckinController)
     *  can never overwrite their own name/phone/email. */
    public Guest updateIdProof(UUID id, String idProofType, String idProofNumber, String address) {
        Guest existing = get(id);
        if (idProofType != null) existing.setIdProofType(idProofType);
        if (idProofNumber != null) existing.setIdProofNumber(idProofNumber);
        if (address != null) existing.setAddress(address);
        return guestRepo.save(existing);
    }
}
