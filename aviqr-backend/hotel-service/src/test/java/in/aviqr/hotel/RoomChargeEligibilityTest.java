package in.aviqr.hotel;

import in.aviqr.hotel.entity.Room;
import in.aviqr.hotel.entity.RoomStatus;
import in.aviqr.hotel.repository.HotelOutletRepository;
import in.aviqr.hotel.repository.RoomRepository;
import in.aviqr.hotel.service.RoomChargeEligibility;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoomChargeEligibilityTest {

    @Mock RoomRepository roomRepo;
    @Mock HotelOutletRepository outletRepo;
    @InjectMocks RoomChargeEligibility eligibility;

    private final UUID hotel = UUID.randomUUID();

    private void room(String number, RoomStatus status) {
        when(roomRepo.findByHotelIdAndRoomNumber(hotel, number))
            .thenReturn(Optional.of(Room.builder().hotelId(hotel).roomNumber(number).status(status).build()));
    }

    @Test void outletOfTheHotelCanChargeAnOccupiedRoom() {
        when(outletRepo.existsByHotelIdAndShopIdAndActiveTrue(hotel, "shop-cafe")).thenReturn(true);
        room("204", RoomStatus.OCCUPIED);
        assertThat(eligibility.allows(hotel, "shop-cafe", "204")).isTrue();
    }

    @Test void hotelsOwnRoomServiceShopCanChargeAnOccupiedRoom() {
        room("204", RoomStatus.OCCUPIED);
        assertThat(eligibility.allows(hotel, "hotel-" + hotel, "204")).isTrue();
        verifyNoInteractions(outletRepo);
    }

    @Test void shopThatIsNotAnOutletOfThisHotelIsRefused() {
        when(outletRepo.existsByHotelIdAndShopIdAndActiveTrue(hotel, "shop-elsewhere")).thenReturn(false);
        assertThat(eligibility.allows(hotel, "shop-elsewhere", "204")).isFalse();
        verifyNoInteractions(roomRepo);
    }

    @Test void vacantRoomIsRefused() {
        when(outletRepo.existsByHotelIdAndShopIdAndActiveTrue(hotel, "shop-cafe")).thenReturn(true);
        room("305", RoomStatus.VACANT);
        assertThat(eligibility.allows(hotel, "shop-cafe", "305")).isFalse();
    }

    @Test void unknownRoomIsRefused() {
        when(outletRepo.existsByHotelIdAndShopIdAndActiveTrue(hotel, "shop-cafe")).thenReturn(true);
        when(roomRepo.findByHotelIdAndRoomNumber(hotel, "999")).thenReturn(Optional.empty());
        assertThat(eligibility.allows(hotel, "shop-cafe", "999")).isFalse();
    }

    @Test void missingInputsAreRefused() {
        assertThat(eligibility.allows(null, "shop-cafe", "204")).isFalse();
        assertThat(eligibility.allows(hotel, "", "204")).isFalse();
        assertThat(eligibility.allows(hotel, "shop-cafe", " ")).isFalse();
    }
}
