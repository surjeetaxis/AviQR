package in.aviqr.hotel.service;
import in.aviqr.hotel.entity.RoomStatus;
import in.aviqr.hotel.repository.HotelOutletRepository;
import in.aviqr.hotel.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.UUID;

/** Decides whether an order from a shop may be billed to a hotel room. The hotel and
 *  room arrive from the guest's browser, so neither is trusted on its own: the shop
 *  must belong to that hotel (one of its outlets, or its own "hotel-{id}" room-service
 *  shop) and the room must have a guest checked in — the same rule the guest-services
 *  page uses before it offers "charge to room". */
@Service @RequiredArgsConstructor
public class RoomChargeEligibility {
    private final RoomRepository roomRepo;
    private final HotelOutletRepository outletRepo;

    public boolean allows(UUID hotelId, String shopId, String roomNumber) {
        if (hotelId == null || shopId == null || shopId.isBlank() || roomNumber == null || roomNumber.isBlank()) return false;
        boolean hotelShop = shopId.equals("hotel-" + hotelId)
            || outletRepo.existsByHotelIdAndShopIdAndActiveTrue(hotelId, shopId);
        if (!hotelShop) return false;
        return roomRepo.findByHotelIdAndRoomNumber(hotelId, roomNumber.trim())
            .map(r -> r.getStatus() == RoomStatus.OCCUPIED)
            .orElse(false);
    }
}
