package in.aviqr.pms.service;

import in.aviqr.pms.client.PaymentGatewayClient;
import in.aviqr.pms.dto.PublicBookingRequest;
import in.aviqr.pms.entity.*;
import in.aviqr.pms.repository.BookingEngineSettingsRepository;
import in.aviqr.pms.repository.OnlinePaymentRepository;
import in.aviqr.pms.repository.ReservationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class OnlineBookingPaymentServiceTest {
    final BookingEngineSettingsRepository settingsRepo = mock(BookingEngineSettingsRepository.class);
    final OnlinePaymentRepository paymentRepo = mock(OnlinePaymentRepository.class);
    final ReservationRepository reservationRepo = mock(ReservationRepository.class);
    final PaymentGatewayClient client = mock(PaymentGatewayClient.class);
    final FolioService folio = mock(FolioService.class);
    final ReservationService reservations = mock(ReservationService.class);
    final TransactionTemplate tx = mock(TransactionTemplate.class);
    final OnlineBookingPaymentService service = new OnlineBookingPaymentService(settingsRepo, paymentRepo, reservationRepo, client, folio, reservations, tx);
    final UUID hotel = UUID.randomUUID();
    final Reservation reservation = Reservation.builder().id(UUID.randomUUID()).hotelId(hotel).status(ReservationStatus.BOOKED).build();
    OnlinePayment stored;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        when(client.gatewayLabel(hotel)).thenReturn(Optional.of("Razorpay"));
        when(paymentRepo.findByReservationId(reservation.getId())).thenAnswer(i -> Optional.ofNullable(stored));
        when(paymentRepo.findById(any())).thenAnswer(i -> Optional.ofNullable(stored));
        when(paymentRepo.save(any())).thenAnswer(i -> stored = i.getArgument(0));
        when(reservationRepo.findById(reservation.getId())).thenReturn(Optional.of(reservation));
        doAnswer(i -> { ((Consumer<Object>) i.getArgument(0)).accept(null); return null; }).when(tx).executeWithoutResult(any());
    }

    void mode(String mode, int percent) {
        when(settingsRepo.findByHotelId(hotel)).thenReturn(Optional.of(BookingEngineSettings.builder().hotelId(hotel).paymentMode(mode).depositPercent(percent).build()));
    }

    PublicBookingRequest req(String option) {
        PublicBookingRequest r = new PublicBookingRequest();
        r.setPaymentOption(option);
        r.setPaymentReturnUrl("https://book.example/#/paid");
        r.setGuestName("Asha Rao");
        return r;
    }

    @Test
    @DisplayName("No gateway or pay-at-hotel settings means pay at the hotel only")
    void payAtHotelFallbacks() {
        mode("OPTIONAL", 30);
        when(client.gatewayLabel(hotel)).thenReturn(Optional.empty());
        assertThat(service.options(hotel).mode()).isEqualTo("PAY_AT_HOTEL");
        assertThatThrownBy(() -> service.choice(hotel, req("DEPOSIT"))).hasMessageContaining("doesn't take online payment");
        assertThat(service.choice(hotel, req(null))).isEqualTo("HOTEL");
    }

    @Test
    @DisplayName("A required deposit can't be skipped")
    void requiredDeposit() {
        mode("REQUIRED", 25);
        assertThat(service.options(hotel)).extracting("mode", "depositPercent", "gateway").containsExactly("REQUIRED", 25, "Razorpay");
        assertThatThrownBy(() -> service.choice(hotel, req("HOTEL"))).hasMessageContaining("deposit");
        assertThat(service.choice(hotel, req("deposit"))).isEqualTo("DEPOSIT");
    }

    @Test
    @DisplayName("The deposit is the hotel's share of what's due, and a retry reuses the payment")
    void startsDeposit() {
        mode("OPTIONAL", 30);
        UUID pid = UUID.randomUUID();
        when(client.create(eq(hotel), any(), eq("INR"), eq(reservation.getId()), anyString(), anyString(), any(), any(), any()))
            .thenReturn(new PaymentGatewayClient.Payment(pid, "AQREF", "RAZORPAY", new BigDecimal("3000.15"), "INR", "CREATED", "https://pay/x", null));
        var p = service.start(reservation, "DEPOSIT", new BigDecimal("10000.50"), "INR", req("DEPOSIT"));
        verify(client).create(eq(hotel), eq(new BigDecimal("3000.15")), eq("INR"), eq(reservation.getId()), anyString(), eq("https://book.example/#/paid"), any(), any(), any());
        assertThat(p.payUrl()).isEqualTo("https://pay/x");
        assertThat(stored.getRequired()).isFalse();
        when(client.get(pid)).thenReturn(Optional.of(new PaymentGatewayClient.Payment(pid, "AQREF", "RAZORPAY", new BigDecimal("3000.15"), "INR", "PENDING", "https://pay/x", null)));
        service.start(reservation, "DEPOSIT", new BigDecimal("10000.50"), "INR", req("DEPOSIT"));
        verify(client, times(1)).create(any(), any(), any(), any(), any(), any(), any(), any(), any());
        assertThat(service.start(reservation, "HOTEL", BigDecimal.TEN, "INR", req("HOTEL"))).isNull();
    }

    @Test
    @DisplayName("A paid payment is posted to the folio once")
    void postsOnce() {
        stored = OnlinePayment.builder().reservationId(reservation.getId()).hotelId(hotel).paymentId(UUID.randomUUID()).paymentReference("AQREF")
            .gateway("RAZORPAY").amount(new BigDecimal("3000")).status("PENDING").build();
        when(client.get(stored.getPaymentId())).thenReturn(Optional.of(new PaymentGatewayClient.Payment(stored.getPaymentId(), "AQREF", "RAZORPAY",
            new BigDecimal("3000"), "INR", "PAID", null, null)));
        service.sync(reservation.getId());
        service.sync(reservation.getId());
        verify(folio, times(1)).addPayment(reservation.getId(), PaymentMethod.CARD, new BigDecimal("3000"), "Online RAZORPAY AQREF", "web-booking-engine");
        assertThat(stored.getStatus()).isEqualTo("PAID");
    }

    @Test
    @DisplayName("An unpaid required deposit releases the booking after the payment window")
    void expiresUnpaidRequired() {
        stored = OnlinePayment.builder().reservationId(reservation.getId()).hotelId(hotel).paymentId(UUID.randomUUID()).amount(BigDecimal.TEN)
            .required(true).status("PENDING").createdAt(LocalDateTime.now().minusHours(2)).build();
        when(paymentRepo.findByStatusIn(any())).thenReturn(List.of(stored));
        when(client.get(any())).thenReturn(Optional.of(new PaymentGatewayClient.Payment(stored.getPaymentId(), "R", "RAZORPAY", BigDecimal.TEN, "INR", "PENDING", null, null)));
        service.sweep();
        verify(reservations).cancel(reservation.getId());
        assertThat(stored.getStatus()).isEqualTo("EXPIRED");
    }

    @Test
    @DisplayName("An unverified payment is never cancelled automatically")
    void keepsUnverified() {
        stored = OnlinePayment.builder().reservationId(reservation.getId()).hotelId(hotel).paymentId(UUID.randomUUID()).amount(BigDecimal.TEN)
            .required(true).status("PENDING").createdAt(LocalDateTime.now().minusHours(2)).build();
        when(paymentRepo.findByStatusIn(any())).thenReturn(List.of(stored));
        when(client.get(any())).thenReturn(Optional.of(new PaymentGatewayClient.Payment(stored.getPaymentId(), "R", "MOBIVERSA", BigDecimal.TEN, "INR", "UNVERIFIED", null, null)));
        service.sweep();
        verify(reservations, never()).cancel(any());
        assertThat(stored.getStatus()).isEqualTo("UNVERIFIED");
    }
}
