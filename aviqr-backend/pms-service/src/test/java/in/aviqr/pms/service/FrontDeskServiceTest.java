package in.aviqr.pms.service;

import in.aviqr.pms.client.HotelRoomDto;
import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.entity.*;
import in.aviqr.pms.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FrontDeskServiceTest {
    @Mock ReservationRepository reservationRepo;
    @Mock RoomReservationRepository roomReservationRepo;
    @Mock RoomTypeRepository roomTypeRepo;
    @Mock HotelServiceClient hotelServiceClient;
    @Mock FolioService folioService;
    @InjectMocks FrontDeskService service;

    final UUID hotel = UUID.randomUUID();
    final RoomType standard = RoomType.builder().id(UUID.randomUUID()).hotelId(hotel).name("Standard").active(true).build();
    final RoomType deluxe = RoomType.builder().id(UUID.randomUUID()).hotelId(hotel).name("Deluxe").active(true).build();
    final HotelRoomDto r101 = room("101", "Standard", "VACANT"), r102 = room("102", "Standard", "VACANT"),
        r201 = room("201", "Deluxe", "VACANT"), r103 = room("103", "Standard", "MAINTENANCE"), r301 = room("301", "Suite", "VACANT");
    Reservation reservation;
    RoomReservation line;

    static HotelRoomDto room(String number, String type, String status) {
        HotelRoomDto r = new HotelRoomDto();
        r.setId(UUID.randomUUID()); r.setRoomNumber(number); r.setRoomType(type); r.setStatus(status); r.setFloor(number.substring(0, 1));
        return r;
    }

    @BeforeEach
    void setUp() {
        reservation = Reservation.builder().id(UUID.randomUUID()).hotelId(hotel).guestName("Asha").guestPhone("+91 98765 43210")
            .checkInDate(LocalDate.now()).checkOutDate(LocalDate.now().plusDays(3)).status(ReservationStatus.BOOKED).build();
        line = new RoomReservation();
        line.setId(UUID.randomUUID());
        line.setReservationId(reservation.getId());
        line.setRoomTypeId(standard.getId());
        line.setRatePlanId(UUID.randomUUID());
        line.setRoomId(r101.getId());
        line.setRoomNumber("101");
        line.setRatePerNight(new BigDecimal("3500"));
        when(reservationRepo.findById(reservation.getId())).thenReturn(Optional.of(reservation));
        when(roomReservationRepo.findByReservationId(reservation.getId())).thenReturn(List.of(line));
        when(hotelServiceClient.getRooms(hotel)).thenReturn(List.of(r101, r102, r201, r103, r301));
        when(roomTypeRepo.findByHotelIdAndActiveTrue(hotel)).thenReturn(List.of(standard, deluxe));
        when(roomReservationRepo.findConflictingForExtension(any(), any(), any(), any())).thenReturn(List.of());
        when(roomReservationRepo.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    @DisplayName("Moves a booked guest to a free room and notes it on the reservation")
    void movesBookedGuest() {
        RoomReservation moved = service.moveRoom(reservation.getId(), line.getId(), r102.getId(), null, "staff-1234567");
        assertThat(moved.getRoomId()).isEqualTo(r102.getId());
        assertThat(moved.getRoomNumber()).isEqualTo("102");
        assertThat(moved.getRatePerNight()).isEqualByComparingTo("3500");
        assertThat(reservation.getNotes()).isEqualTo("Moved 101 → 102 by staff-12");
        verify(hotelServiceClient, never()).updateRoomOccupancy(any(), any(), any(), any(), any());
        verify(folioService, never()).addCharge(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("An upgrade after check-in syncs occupancy and posts the rate difference for the remaining nights")
    void upgradesCheckedInGuest() {
        reservation.setStatus(ReservationStatus.CHECKED_IN);
        reservation.setCheckInDate(LocalDate.now().minusDays(1));
        RoomReservation moved = service.moveRoom(reservation.getId(), line.getId(), r201.getId(), new BigDecimal("5500"), "staff");
        assertThat(moved.getRoomTypeId()).isEqualTo(deluxe.getId());
        assertThat(moved.getRatePlanId()).isNull();
        verify(hotelServiceClient).updateRoomOccupancy(r101.getId(), null, null, null, "VACANT");
        verify(hotelServiceClient).updateRoomOccupancy(eq(r201.getId()), eq("Asha"), any(), any(), eq("OCCUPIED"));
        // 3 nights left from today at +2000/night
        verify(folioService).addCharge(reservation.getId(), line.getId(), FolioChargeType.ROOM, "Room change 101 → 201 (3 night(s))", new BigDecimal("6000"));
    }

    @Test
    @DisplayName("Refuses rooms that are taken, under maintenance, or have no PMS room type")
    void refusesUnavailableRooms() {
        when(roomReservationRepo.findConflictingForExtension(eq(r102.getId()), any(), any(), any())).thenReturn(List.of(new RoomReservation()));
        assertThatThrownBy(() -> service.moveRoom(reservation.getId(), line.getId(), r102.getId(), null, "s")).hasMessageContaining("booked");
        assertThatThrownBy(() -> service.moveRoom(reservation.getId(), line.getId(), r103.getId(), null, "s")).hasMessageContaining("maintenance");
        assertThatThrownBy(() -> service.moveRoom(reservation.getId(), line.getId(), r301.getId(), null, "s")).hasMessageContaining("no matching room type");
        assertThatThrownBy(() -> service.moveRoom(reservation.getId(), line.getId(), r101.getId(), null, "s")).hasMessageContaining("already");
        reservation.setStatus(ReservationStatus.CHECKED_OUT);
        assertThatThrownBy(() -> service.moveRoom(reservation.getId(), line.getId(), r201.getId(), null, "s")).hasMessageContaining("Only booked");
    }

    @Test
    @DisplayName("Room options mark the current room, busy rooms and maintenance")
    void roomOptions() {
        when(roomReservationRepo.findConflictingForExtension(eq(r102.getId()), any(), any(), any())).thenReturn(List.of(new RoomReservation()));
        var options = service.roomOptions(reservation.getId(), line.getId());
        assertThat(options).filteredOn(FrontDeskService.RoomOption::current).singleElement().extracting(FrontDeskService.RoomOption::roomNumber).isEqualTo("101");
        assertThat(options).filteredOn(o -> o.roomNumber().equals("102")).singleElement().extracting(FrontDeskService.RoomOption::available).isEqualTo(false);
        assertThat(options).filteredOn(o -> o.roomNumber().equals("103")).singleElement().extracting(FrontDeskService.RoomOption::available).isEqualTo(false);
        assertThat(options).filteredOn(o -> o.roomNumber().equals("201")).singleElement().extracting(FrontDeskService.RoomOption::available).isEqualTo(true);
    }

    @Test
    @DisplayName("Looks up by voucher reference, phone or name, within the hotel only")
    void lookup() {
        String ref = reservation.getId().toString().substring(0, 8);
        when(reservationRepo.findByReferencePrefix(ref)).thenReturn(List.of(reservation));
        when(reservationRepo.findByHotelIdOrderByCreatedAtDesc(hotel)).thenReturn(List.of(reservation));
        assertThat(service.lookup(hotel, ref.toUpperCase())).containsExactly(reservation);
        assertThat(service.lookup(UUID.randomUUID(), ref)).isEmpty();
        assertThat(service.lookup(hotel, "98765 43210")).containsExactly(reservation);
        assertThat(service.lookup(hotel, "ash")).containsExactly(reservation);
        assertThat(service.lookup(hotel, "zz")).isEmpty();
    }
}
