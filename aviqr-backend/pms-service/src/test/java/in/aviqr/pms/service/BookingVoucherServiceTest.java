package in.aviqr.pms.service;

import in.aviqr.pms.client.HotelRoomDto;
import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.client.NotificationClient;
import in.aviqr.pms.dto.PublicVoucher;
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
class BookingVoucherServiceTest {
    @Mock ReservationRepository reservationRepo;
    @Mock RoomReservationRepository roomReservationRepo;
    @Mock RoomTypeRepository roomTypeRepo;
    @Mock RatePlanRepository ratePlanRepo;
    @Mock FolioChargeRepository chargeRepo;
    @Mock GuestRepository guestRepo;
    @Mock FolioPaymentRepository paymentRepo;
    @Mock HotelServiceClient hotelServiceClient;
    @Mock NotificationClient notificationClient;
    @Mock PublicBookingService publicBookingService;
    @Spy VoucherTokens tokens = newTokens();
    @InjectMocks BookingVoucherService service;

    final UUID hotel = UUID.randomUUID();
    final UUID guestId = UUID.randomUUID();
    final RoomType standard = RoomType.builder().id(UUID.randomUUID()).hotelId(hotel).name("Standard").build();
    final RatePlan flexible = RatePlan.builder().id(UUID.randomUUID()).hotelId(hotel).roomTypeId(standard.getId())
        .name("Flexible").mealPlan(MealPlan.ROOM_ONLY).cancellationPolicy("Free cancellation until 24h before").build();
    final UUID roomId = UUID.randomUUID();
    Reservation reservation;

    static VoucherTokens newTokens() {
        try { return new VoucherTokens("test-secret"); } catch (Exception e) { throw new IllegalStateException(e); }
    }

    @BeforeEach
    void setUp() {
        reservation = Reservation.builder().id(UUID.fromString("c967920c-f751-4a1f-ab78-51b528b5dd1f")).hotelId(hotel).guestId(guestId)
            .guestName("Asha <b>Rao</b>").guestPhone("+91 98765 43210").checkInDate(LocalDate.of(2026, 10, 20))
            .checkOutDate(LocalDate.of(2026, 10, 22)).adults(2).children(0)
            .notes("Guest request: Late arrival <script>\nEmail: asha@example.com").build();
        RoomReservation line = new RoomReservation();
        line.setReservationId(reservation.getId());
        line.setRoomTypeId(standard.getId());
        line.setRatePlanId(flexible.getId());
        line.setRoomId(roomId);
        line.setRatePerNight(new BigDecimal("3500"));
        HotelRoomDto room = new HotelRoomDto();
        room.setId(roomId);
        room.setFloor("1st Floor");
        room.setRoomSide("East wing");
        room.setViewType("City view");
        room.setRoomNumber("101");
        when(reservationRepo.findById(reservation.getId())).thenReturn(Optional.of(reservation));
        when(roomReservationRepo.findByReservationId(reservation.getId())).thenReturn(List.of(line));
        when(roomTypeRepo.findById(standard.getId())).thenReturn(Optional.of(standard));
        when(ratePlanRepo.findById(flexible.getId())).thenReturn(Optional.of(flexible));
        when(hotelServiceClient.getRooms(hotel)).thenReturn(List.of(room));
        when(chargeRepo.findByReservationIdOrderByCreatedAtAsc(reservation.getId())).thenReturn(List.of(
            FolioCharge.builder().reservationId(reservation.getId()).type(FolioChargeType.ADDON).description("Late Checkout").amount(new BigDecimal("500")).build()));
        when(publicBookingService.estimatedTaxes(eq(hotel), any(), eq(2L))).thenReturn(new BigDecimal("200"));
        when(guestRepo.findById(guestId)).thenReturn(Optional.of(Guest.builder().id(guestId).hotelId(hotel).name("Asha").email("asha@example.com").build()));
    }

    @Test
    @DisplayName("Builds the voucher with rooms, side and view, extras and estimated taxes, but no room number or phone")
    void buildsVoucher() {
        PublicVoucher v = service.voucher(hotel, reservation.getId(), tokens.tokenFor(reservation.getId())).orElseThrow();
        assertThat(v.reference()).isEqualTo("C967920C");
        assertThat(v.rooms()).singleElement().satisfies(r -> {
            assertThat(r.roomType()).isEqualTo("Standard");
            assertThat(r.side()).isEqualTo("East wing");
            assertThat(r.view()).isEqualTo("City view");
            assertThat(r.mealPlan()).isEqualTo("ROOM_ONLY");
        });
        assertThat(v.roomTotal()).isEqualByComparingTo("7000");
        assertThat(v.extrasTotal()).isEqualByComparingTo("500");
        assertThat(v.taxes()).isEqualByComparingTo("200");
        assertThat(v.taxesEstimated()).isTrue();
        assertThat(v.grandTotal()).isEqualByComparingTo("7700");
        assertThat(v.paid()).isZero();
        assertThat(v.balanceDue()).isEqualByComparingTo("7700");
        assertThat(v.specialRequests()).isEqualTo("Late arrival <script>");
        assertThat(v.emailHint()).isEqualTo("a***@example.com");
        assertThat(v.toString()).doesNotContain("98765").doesNotContain("101");
        assertThat(v.preCheckedIn()).isFalse();
    }

    @Test
    @DisplayName("Booked stays link to online pre-check-in until the guest has done it")
    void preCheckinLink() {
        org.springframework.test.util.ReflectionTestUtils.setField(service, "webUrl", "https://aviqr.com/");
        reservation.setStatus(ReservationStatus.BOOKED);
        String token = tokens.tokenFor(reservation.getId());
        assertThat(service.voucher(hotel, reservation.getId(), token).orElseThrow().preCheckinUrl())
            .isEqualTo("https://aviqr.com/pms/contactless-checkin/" + reservation.getId());
        reservation.setPreCheckedIn(true);
        assertThat(service.voucher(hotel, reservation.getId(), token).orElseThrow().preCheckinUrl()).isNull();
        reservation.setPreCheckedIn(false);
        reservation.setStatus(ReservationStatus.CHECKED_IN);
        assertThat(service.voucher(hotel, reservation.getId(), token).orElseThrow().preCheckinUrl()).isNull();
    }

    @Test
    @DisplayName("A wrong token or another hotel's id reveals nothing")
    void rejectsBadToken() {
        assertThat(service.voucher(hotel, reservation.getId(), "nope")).isEmpty();
        assertThat(service.voucher(UUID.randomUUID(), reservation.getId(), tokens.tokenFor(reservation.getId()))).isEmpty();
        assertThat(tokens.matches(reservation.getId(), tokens.tokenFor(reservation.getId()))).isTrue();
        assertThat(newTokens().tokenFor(reservation.getId())).isEqualTo(tokens.tokenFor(reservation.getId()));
    }

    @Test
    @DisplayName("Finds a booking by reference and phone, ignoring country code and spacing")
    void findsByReferenceAndPhone() {
        when(reservationRepo.findByReferencePrefix("c967920c")).thenReturn(List.of(reservation));
        assertThat(service.find("C967920C", "9876543210")).contains(reservation);
        assertThat(service.find("c967920c", "+91-98765-43210")).contains(reservation);
        assertThat(service.find("C967920C", "9999999999")).isEmpty();
        assertThat(service.find("C96792", "9876543210")).isEmpty();
        assertThat(service.find("'; drop--", "9876543210")).isEmpty();
    }

    @Test
    @DisplayName("Emails an escaped voucher to the guest, at most three times an hour")
    void emailsEscapedVoucherWithLimit() {
        when(hotelServiceClient.bookingEngineProperty(eq(hotel), any(), any())).thenReturn(Map.of("name", "Grand Palace", "city", "Chennai"));
        when(hotelServiceClient.registeredStorefront(eq(hotel), any())).thenReturn(Optional.empty());
        when(notificationClient.sendEmail(anyString(), anyString(), anyString())).thenReturn(true);

        assertThat(service.email(reservation.getId(), "bm.aviqr.com")).isTrue();
        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);
        verify(notificationClient).sendEmail(eq("asha@example.com"), contains("C967920C"), html.capture());
        assertThat(html.getValue()).contains("Asha &lt;b&gt;Rao&lt;/b&gt;").contains("Late arrival &lt;script&gt;")
            .doesNotContain("<script>").contains("/#/voucher/" + hotel + "/" + reservation.getId() + "/" + tokens.tokenFor(reservation.getId()));

        assertThat(service.email(reservation.getId(), "bm.aviqr.com")).isTrue();
        assertThat(service.email(reservation.getId(), "bm.aviqr.com")).isTrue();
        assertThat(service.email(reservation.getId(), "bm.aviqr.com")).isFalse();
    }

    @Test
    @DisplayName("Links point to the hotel's registered domain, never an arbitrary host")
    void linksUseRegisteredStorefrontOnly() {
        when(hotelServiceClient.bookingEngineProperty(eq(hotel), any(), any())).thenReturn(Map.of("name", "The Leela Resort"));
        when(hotelServiceClient.registeredStorefront(hotel, "leela.aviqr.com")).thenReturn(Optional.of("https://leela.aviqr.com"));
        when(hotelServiceClient.registeredStorefront(hotel, "evil.example")).thenReturn(Optional.empty());
        when(notificationClient.sendEmail(anyString(), anyString(), anyString())).thenReturn(true);
        org.springframework.test.util.ReflectionTestUtils.setField(service, "publicStorefrontUrl", "https://bm.aviqr.com");

        service.email(reservation.getId(), "leela.aviqr.com");
        service.email(reservation.getId(), "evil.example");
        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);
        verify(notificationClient, times(2)).sendEmail(anyString(), anyString(), html.capture());
        assertThat(html.getAllValues().get(0)).contains("https://leela.aviqr.com/#/voucher/");
        assertThat(html.getAllValues().get(1)).contains("https://bm.aviqr.com/#/voucher/").doesNotContain("evil.example");
    }
}
