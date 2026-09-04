package in.aviqr.hotel.service;
import in.aviqr.hotel.entity.HotelRole;
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

    // Stricter than hasAccess: any hotel_access row (OWNER, GENERAL_MANAGER,
    // OUTLET_MANAGER, or STAFF) used to satisfy hasAccess, which let a
    // narrowly-scoped OUTLET_MANAGER grant/revoke access for anyone — including
    // promoting themselves to OWNER. Granting/revoking access is now gated on
    // this instead: only the hotel's owner-of-record or an OWNER-role access
    // row (or platform ADMIN/SUPPORT) may manage who else has access.
    public boolean isOwner(UUID hotelId, String uid, String role) {
        if ("ADMIN".equals(role) || "SUPPORT".equals(role)) return true;
        if (hotelId == null || uid == null) return false;
        boolean ownerOnHotel = hotelRepo.findById(hotelId).map(h -> uid.equals(h.getOwnerId())).orElse(false);
        if (ownerOnHotel) return true;
        return accessRepo.findByHotelIdAndUserId(hotelId, uid).stream()
            .anyMatch(a -> a.getRole() == HotelRole.OWNER);
    }
}
