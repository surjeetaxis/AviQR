package in.aviqr.hotel.service;
import in.aviqr.hotel.repository.HotelAccessRepository;
import in.aviqr.hotel.repository.HotelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.UUID;

/** Shared owner/staff authorization check reused by HotelController, HotelOutletController, RoomChargeController. */
@Service @RequiredArgsConstructor
public class HotelAccessService {
    private final HotelRepository hotelRepo;
    private final HotelAccessRepository accessRepo;

    public boolean hasAccess(UUID hotelId, String uid, String role) {
        if ("ADMIN".equals(role) || "SUPPORT".equals(role)) return true;
        if (hotelId == null || uid == null) return false;
        boolean ownerOnHotel = hotelRepo.findById(hotelId).map(h -> uid.equals(h.getOwnerId())).orElse(false);
        return ownerOnHotel || accessRepo.existsByHotelIdAndUserId(hotelId, uid);
    }
}
