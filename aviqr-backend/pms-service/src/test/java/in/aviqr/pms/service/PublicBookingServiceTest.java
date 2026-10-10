package in.aviqr.pms.service;

import in.aviqr.pms.dto.CreateReservationRequest;
import in.aviqr.pms.dto.PublicBookingConfirmation;
import in.aviqr.pms.dto.PublicBookingRequest;
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
class PublicBookingServiceTest {
    @Mock ReservationService reservationService;
    @Mock ReservationRepository reservationRepo;
    @Mock RoomTypeRepository roomTypeRepo;
    @Mock RatePlanRepository ratePlanRepo;
    @Mock RatePlanService ratePlanService;
    @Mock AddOnRepository addOnRepo;
    @Mock SurchargeRepository surchargeRepo;
    @Mock DiscountPackageRepository discountRepo;
    @Mock PromoCodeRepository promoRepo;
    @Mock FolioService folioService;
    @Mock VoucherRepository voucherRepo;
    @Mock VoucherService voucherService;
    @Mock FolioPaymentRepository paymentRepo;
    @Mock BookingEngineSettingsRepository settingsRepo;
    @Mock OnlineBookingPaymentService onlinePayments;
    @InjectMocks PublicBookingService service;

    final UUID hotel = UUID.randomUUID();
    final LocalDate in = LocalDate.of(2026, 11, 10), out = LocalDate.of(2026, 11, 12);
    final RoomType deluxe = RoomType.builder().id(UUID.randomUUID()).hotelId(hotel).name("Deluxe").maxOccupancy(2).active(true).build();
    final RatePlan flexible = RatePlan.builder().id(UUID.randomUUID()).hotelId(hotel).roomTypeId(deluxe.getId()).name("Flexible").active(true).build();
    final AddOn pickup = AddOn.builder().id(UUID.randomUUID()).hotelId(hotel).name("Airport pickup").price(new BigDecimal("1500")).active(true).build();
    final DiscountPackage tenPercent = DiscountPackage.builder().id(UUID.randomUUID()).hotelId(hotel).name("Early bird")
        .valueType(ValueType.PERCENT).value(new BigDecimal("10")).active(true).build();
    final Reservation saved = Reservation.builder().id(UUID.randomUUID()).hotelId(hotel).checkInDate(in).checkOutDate(out)
        .status(ReservationStatus.BOOKED).build();

    @BeforeEach
    void setUp() {
        when(roomTypeRepo.findById(deluxe.getId())).thenReturn(Optional.of(deluxe));
        when(ratePlanRepo.findById(flexible.getId())).thenReturn(Optional.of(flexible));
        when(ratePlanService.totalForStay(flexible.getId(), in, out)).thenReturn(new BigDecimal("8000"));
        when(addOnRepo.findById(pickup.getId())).thenReturn(Optional.of(pickup));
        when(surchargeRepo.findByHotelIdAndActiveTrue(hotel)).thenReturn(List.of(
            Surcharge.builder().hotelId(hotel).name("City tax").valueType(ValueType.FIXED).value(new BigDecimal("100")).active(true).build(),
            Surcharge.builder().hotelId(hotel).name("GST").valueType(ValueType.PERCENT).value(new BigDecimal("12")).active(true).build()));
        when(promoRepo.findByHotelIdAndCodeIgnoreCase(hotel, "EARLY10")).thenReturn(Optional.of(
            PromoCode.builder().id(UUID.randomUUID()).hotelId(hotel).code("EARLY10").discountPackageId(tenPercent.getId()).active(true).build()));
        when(discountRepo.findById(tenPercent.getId())).thenReturn(Optional.of(tenPercent));
        when(promoRepo.use(any())).thenReturn(1);
        when(reservationService.create(any(), anyString())).thenReturn(saved);
    }

    PublicBookingRequest request(int rooms) {
        PublicBookingRequest req = new PublicBookingRequest();
        req.setGuestName("Asha Rao");
        req.setGuestPhone("+91 98765 43210");
        req.setGuestEmail("asha@example.com");
        req.setSpecialRequests("High floor please");
        req.setCheckInDate(in);
        req.setCheckOutDate(out);
        req.setAdults(3);
        req.setChildren(0);
        req.setBookingRequestId(UUID.randomUUID());
        List<PublicBookingRequest.RoomLine> lines = new ArrayList<>();
        for (int i = 0; i < rooms; i++) {
            PublicBookingRequest.RoomLine l = new PublicBookingRequest.RoomLine();
            l.setRoomTypeId(deluxe.getId());
            l.setRatePlanId(flexible.getId());
            l.setRoomId(UUID.randomUUID());
            lines.add(l);
        }
        req.setRooms(lines);
        return req;
    }

    @Test
    @DisplayName("Books several rooms as one reservation and posts add-ons and the promo discount")
    void multiRoomWithExtras() {
        PublicBookingRequest req = request(2);
        PublicBookingRequest.AddOnLine addOn = new PublicBookingRequest.AddOnLine();
        addOn.setAddOnId(pickup.getId());
        addOn.setQuantity(2);
        req.setAddOns(List.of(addOn));
        req.setPromoCode("early10");

        PublicBookingConfirmation c = service.book(hotel, req);

        ArgumentCaptor<CreateReservationRequest> sent = ArgumentCaptor.forClass(CreateReservationRequest.class);
        verify(reservationService).create(sent.capture(), eq("web-booking-engine"));
        assertThat(sent.getValue().getRooms()).hasSize(2);
        assertThat(sent.getValue().getGuestEmail()).isEqualTo("asha@example.com");
        assertThat(sent.getValue().getSource()).isEqualTo(ReservationSource.DIRECT);
        assertThat(sent.getValue().getNotes()).contains("Guest request: High floor please").contains("Promo: EARLY10");

        verify(folioService).addCharge(saved.getId(), null, FolioChargeType.ADDON, "Airport pickup x2", new BigDecimal("3000"));
        verify(folioService).addCharge(saved.getId(), null, FolioChargeType.DISCOUNT, "Early bird (EARLY10)", new BigDecimal("-1600.00"));
        assertThat(c.rooms()).isEqualTo(2);
        assertThat(c.totals().roomTotal()).isEqualByComparingTo("16000");
        assertThat(c.totals().addOnTotal()).isEqualByComparingTo("3000");
        assertThat(c.totals().discount()).isEqualByComparingTo("1600");
        // City tax 100 x 2 nights + 12% GST on the discounted room total (14400)
        assertThat(c.totals().estimatedTaxes()).isEqualByComparingTo("1928");
        assertThat(c.totals().grandTotal()).isEqualByComparingTo("19328");
    }

    @Test
    @DisplayName("A retried request returns the booking without charging add-ons or discounts again")
    void retryDoesNotRepostExtras() {
        PublicBookingRequest req = request(1);
        req.setAdults(2);
        PublicBookingRequest.AddOnLine addOn = new PublicBookingRequest.AddOnLine();
        addOn.setAddOnId(pickup.getId());
        req.setAddOns(List.of(addOn));
        when(reservationRepo.findByBookingRequestId(req.getBookingRequestId().toString())).thenReturn(Optional.of(saved));

        PublicBookingConfirmation c = service.book(hotel, req);

        verify(folioService, never()).addCharge(any(), any(), any(), anyString(), any());
        assertThat(c.reservationId()).isEqualTo(saved.getId());
        assertThat(c.totals().addOnTotal()).isEqualByComparingTo("1500");
    }

    @Test
    @DisplayName("Rejects more guests than the chosen rooms sleep")
    void rejectsOverCapacity() {
        PublicBookingRequest req = request(1);
        req.setAdults(3);
        assertThatThrownBy(() -> service.book(hotel, req)).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("sleep up to 2");
        verify(reservationService, never()).create(any(), anyString());
    }

    @Test
    @DisplayName("Rejects an unknown promo code before creating anything")
    void rejectsBadPromo() {
        PublicBookingRequest req = request(2);
        req.setPromoCode("NOPE");
        assertThatThrownBy(() -> service.book(hotel, req)).isInstanceOf(IllegalArgumentException.class);
        verify(reservationService, never()).create(any(), anyString());
    }

    @Test
    @DisplayName("Rejects a rate plan that belongs to another room type or hotel")
    void rejectsMismatchedRatePlan() {
        RatePlan other = RatePlan.builder().id(UUID.randomUUID()).hotelId(UUID.randomUUID()).roomTypeId(deluxe.getId()).active(true).build();
        when(ratePlanRepo.findById(other.getId())).thenReturn(Optional.of(other));
        PublicBookingRequest req = request(1);
        req.setAdults(2);
        req.getRooms().getFirst().setRatePlanId(other.getId());
        assertThatThrownBy(() -> service.book(hotel, req)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("A gift voucher pays what it can now; the rest is due at the hotel")
    void giftVoucherPartlyPays() {
        Voucher gift = Voucher.builder().id(UUID.randomUUID()).hotelId(hotel).code("GIFT2000").initialValue(new BigDecimal("2000"))
            .balance(new BigDecimal("2000")).active(true).build();
        when(voucherRepo.findByHotelIdAndCode(hotel, "gift2000")).thenReturn(Optional.empty());
        when(voucherRepo.findByHotelIdAndCode(hotel, "GIFT2000")).thenReturn(Optional.of(gift));
        PublicBookingRequest req = request(1);
        req.setAdults(2);
        req.setGiftVoucherCode("gift2000");

        PublicBookingConfirmation c = service.book(hotel, req);

        // 8000 rooms + 200 city tax + 12% GST (960) = 9160
        assertThat(c.totals().grandTotal()).isEqualByComparingTo("9160");
        assertThat(c.totals().voucherApplied()).isEqualByComparingTo("2000");
        assertThat(c.totals().balanceDue()).isEqualByComparingTo("7160");
        verify(voucherService).redeem(hotel, "GIFT2000", new BigDecimal("2000"));
        verify(folioService).addPayment(saved.getId(), PaymentMethod.VOUCHER, new BigDecimal("2000"), "GIFT2000", "web-booking-engine");
    }

    @Test
    @DisplayName("A voucher worth more than the stay only redeems the total, and a retry redeems nothing")
    void giftVoucherCoversAllAndRetryIsSafe() {
        Voucher big = Voucher.builder().id(UUID.randomUUID()).hotelId(hotel).code("BIG").initialValue(new BigDecimal("50000"))
            .balance(new BigDecimal("50000")).active(true).build();
        when(voucherRepo.findByHotelIdAndCode(hotel, "BIG")).thenReturn(Optional.of(big));
        PublicBookingRequest req = request(1);
        req.setAdults(2);
        req.setGiftVoucherCode("BIG");
        PublicBookingConfirmation c = service.book(hotel, req);
        assertThat(c.totals().voucherApplied()).isEqualByComparingTo("9160");
        assertThat(c.totals().balanceDue()).isZero();
        verify(voucherService).redeem(hotel, "BIG", new BigDecimal("9160.00"));

        when(reservationRepo.findByBookingRequestId(req.getBookingRequestId().toString())).thenReturn(Optional.of(saved));
        when(paymentRepo.findByReservationIdOrderByCreatedAtAsc(saved.getId())).thenReturn(List.of(
            FolioPayment.builder().reservationId(saved.getId()).method(PaymentMethod.VOUCHER).amount(new BigDecimal("9160")).build()));
        PublicBookingConfirmation again = service.book(hotel, req);
        assertThat(again.totals().voucherApplied()).isEqualByComparingTo("9160");
        verify(voucherService, times(1)).redeem(any(), any(), any());
    }

    @Test
    @DisplayName("An unknown, inactive or empty gift voucher is refused before booking")
    void rejectsBadGiftVoucher() {
        when(voucherRepo.findByHotelIdAndCode(hotel, "USED")).thenReturn(Optional.of(Voucher.builder().hotelId(hotel).code("USED")
            .initialValue(BigDecimal.TEN).balance(BigDecimal.ZERO).active(true).build()));
        PublicBookingRequest req = request(1);
        req.setAdults(2);
        req.setGiftVoucherCode("USED");
        assertThatThrownBy(() -> service.book(hotel, req)).hasMessageContaining("gift voucher");
        req.setGiftVoucherCode("NOPE");
        assertThatThrownBy(() -> service.book(hotel, req)).hasMessageContaining("gift voucher");
        verify(reservationService, never()).create(any(), anyString());
    }

    @Test
    @DisplayName("Promo codes outside their dates are not offered, and fixed discounts never exceed the room total")
    void promoDatesAndCap() {
        when(promoRepo.findByHotelIdAndCodeIgnoreCase(hotel, "SUMMER")).thenReturn(Optional.of(PromoCode.builder().hotelId(hotel)
            .code("SUMMER").discountPackageId(tenPercent.getId()).validTo(in.minusDays(1)).active(true).build()));
        assertThat(service.promo(hotel, "SUMMER", new BigDecimal("8000"), in)).isEmpty();

        DiscountPackage flat = DiscountPackage.builder().id(UUID.randomUUID()).hotelId(hotel).name("Flat")
            .valueType(ValueType.FIXED).value(new BigDecimal("5000")).active(true).build();
        when(discountRepo.findById(flat.getId())).thenReturn(Optional.of(flat));
        when(promoRepo.findByHotelIdAndCodeIgnoreCase(hotel, "FLAT")).thenReturn(Optional.of(PromoCode.builder().hotelId(hotel)
            .code("FLAT").discountPackageId(flat.getId()).active(true).build()));
        assertThat(service.promo(hotel, "FLAT", new BigDecimal("3000"), in)).get()
            .satisfies(p -> assertThat(p.discount()).isEqualByComparingTo("3000"));
    }

    @Test
    @DisplayName("Terms the hotel requires must be accepted, and acceptance is noted on the booking")
    void termsMustBeAccepted() {
        when(settingsRepo.findByHotelId(hotel)).thenReturn(Optional.of(BookingEngineSettings.builder().hotelId(hotel)
            .termsAndConditions("No smoking in rooms.").requireTermsAcceptance(true).build()));
        PublicBookingRequest req = request(2);

        assertThatThrownBy(() -> service.book(hotel, req)).isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("terms and conditions");
        verify(reservationService, never()).create(any(), anyString());

        req.setTermsAccepted(true);
        service.book(hotel, req);
        ArgumentCaptor<CreateReservationRequest> sent = ArgumentCaptor.forClass(CreateReservationRequest.class);
        verify(reservationService).create(sent.capture(), anyString());
        assertThat(sent.getValue().getNotes()).contains("Accepted booking terms");
    }

    @Test
    @DisplayName("No acceptance is needed when the hotel has no terms or doesn't require it")
    void termsOptional() {
        assertThat(service.policies(hotel).termsRequired()).isFalse();
        when(settingsRepo.findByHotelId(hotel)).thenReturn(Optional.of(BookingEngineSettings.builder().hotelId(hotel)
            .termsAndConditions("No smoking in rooms.").requireTermsAcceptance(false).build()));
        assertThat(service.policies(hotel).termsRequired()).isFalse();
        assertThatCode(() -> service.book(hotel, request(2))).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Promo limits: used up, too short a stay, too small a total")
    void promoLimits() {
        PromoCode code = PromoCode.builder().id(UUID.randomUUID()).hotelId(hotel).code("LIMITED").discountPackageId(tenPercent.getId())
            .active(true).maxUses(5).usedCount(5).build();
        when(promoRepo.findByHotelIdAndCodeIgnoreCase(hotel, "LIMITED")).thenReturn(Optional.of(code));
        assertThat(service.promo(hotel, "LIMITED", new BigDecimal("8000"), in, out)).isEmpty();
        code.setUsedCount(4);
        code.setMinNights(3);
        assertThat(service.promo(hotel, "LIMITED", new BigDecimal("8000"), in, out)).isEmpty();
        assertThat(service.promo(hotel, "LIMITED", new BigDecimal("8000"), in, out.plusDays(1))).isPresent();
        code.setMinNights(null);
        code.setMinAmount(new BigDecimal("9000"));
        assertThat(service.promo(hotel, "LIMITED", new BigDecimal("8000"), in, out)).isEmpty();
        assertThat(service.promo(hotel, "LIMITED", new BigDecimal("9000"), in, out)).isPresent();
    }

    @Test
    @DisplayName("A booking counts one promo use; a code used up meanwhile refuses the booking")
    void promoUseCounted() {
        PublicBookingRequest req = request(2);
        req.setPromoCode("EARLY10");
        service.book(hotel, req);
        verify(promoRepo, times(1)).use(any());

        when(promoRepo.use(any())).thenReturn(0);
        PublicBookingRequest again = request(2);
        again.setPromoCode("EARLY10");
        assertThatThrownBy(() -> service.book(hotel, again)).hasMessageContaining("fully used");
    }

    @Test
    @DisplayName("A retried booking doesn't count the promo again")
    void promoRetryNotCounted() {
        PublicBookingRequest req = request(2);
        req.setPromoCode("EARLY10");
        when(reservationRepo.findByBookingRequestId(req.getBookingRequestId().toString())).thenReturn(Optional.of(saved));
        service.book(hotel, req);
        verify(promoRepo, never()).use(any());
    }
}
