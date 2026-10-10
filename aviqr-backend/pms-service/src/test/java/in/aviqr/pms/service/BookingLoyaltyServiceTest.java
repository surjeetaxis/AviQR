package in.aviqr.pms.service;

import in.aviqr.pms.client.NotificationClient;
import in.aviqr.pms.entity.Guest;
import in.aviqr.pms.entity.LoyaltyProgramConfig;
import in.aviqr.pms.repository.GuestRepository;
import in.aviqr.pms.repository.LoyaltyProgramConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BookingLoyaltyServiceTest {
    final LoyaltyProgramConfigRepository configs = mock(LoyaltyProgramConfigRepository.class);
    final GuestRepository guests = mock(GuestRepository.class);
    final NotificationClient mail = mock(NotificationClient.class);
    final BookingLoyaltyService service = new BookingLoyaltyService(configs, guests, mail, "test-internal-secret-0123456789abcdef");
    final UUID hotel = UUID.randomUUID();
    final Guest asha = Guest.builder().id(UUID.randomUUID()).hotelId(hotel).name("Asha").phone("9876543210").email("asha@example.com").loyaltyPoints(500).build();

    @BeforeEach
    void setUp() {
        when(configs.findByHotelId(hotel)).thenReturn(Optional.of(LoyaltyProgramConfig.builder().hotelId(hotel)
            .earnRatePercent(new BigDecimal("5")).redemptionValue(new BigDecimal("0.50")).active(true).build()));
        when(guests.findByHotelIdAndPhoneContaining(eq(hotel), anyString())).thenReturn(List.of(asha));
        when(guests.findById(asha.getId())).thenReturn(Optional.of(asha));
        when(mail.sendEmail(anyString(), anyString(), anyString())).thenReturn(true);
    }

    String emailedCode() {
        ArgumentCaptor<String> subject = ArgumentCaptor.forClass(String.class);
        verify(mail, atLeastOnce()).sendEmail(eq("asha@example.com"), subject.capture(), anyString());
        return subject.getValue().replaceAll("[^0-9]", "");
    }

    @Test
    void codeUnlocksPointsForTheSamePhoneWrittenDifferently() {
        var sent = service.sendCode(hotel, "+91 98765 43210").orElseThrow();
        assertThat(sent.emailHint()).doesNotContain("asha@");
        var member = service.verify(hotel, "+91-9876543210", sent.challenge(), emailedCode()).orElseThrow();
        assertThat(member.points()).isEqualTo(500);
        assertThat(service.guestFor(hotel, member.token())).contains(asha);
        assertThat(service.guestFor(UUID.randomUUID(), member.token())).isEmpty();
        assertThat(service.guestFor(hotel, member.token() + "x")).isEmpty();
    }

    @Test
    void wrongCodesAndOtherPhonesFail() {
        var sent = service.sendCode(hotel, "9876543210").orElseThrow();
        String code = emailedCode();
        String wrong = code.equals("000000") ? "111111" : "000000";
        assertThat(service.verify(hotel, "9876543210", sent.challenge(), wrong)).isEmpty();
        assertThat(service.verify(hotel, "9999943210", sent.challenge(), code)).isEmpty();
        for (int i = 0; i < 5; i++) service.verify(hotel, "9876543210", sent.challenge(), wrong);
        assertThat(service.verify(hotel, "9876543210", sent.challenge(), code)).as("locked after too many tries").isEmpty();
    }

    @Test
    void sendsAreLimitedAndNeedAnEmail() {
        for (int i = 0; i < 3; i++) service.sendCode(hotel, "9876543210");
        assertThatThrownBy(() -> service.sendCode(hotel, "9876543210")).isInstanceOf(IllegalStateException.class);
        asha.setEmail(null);
        assertThat(service.sendCode(hotel, "1234567890")).isEmpty();
    }

    @Test
    void earningAndRedeeming() {
        assertThat(service.pointsFor(hotel, new BigDecimal("8000"))).isEqualTo(400);
        assertThat(service.redeem(hotel, asha, 200)).isEqualByComparingTo("100.00");
        assertThat(asha.getLoyaltyPoints()).isEqualTo(300);
        assertThatThrownBy(() -> service.redeem(hotel, asha, 301)).isInstanceOf(IllegalArgumentException.class);
    }
}
