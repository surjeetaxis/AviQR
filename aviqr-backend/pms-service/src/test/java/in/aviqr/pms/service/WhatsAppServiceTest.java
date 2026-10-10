package in.aviqr.pms.service;

import in.aviqr.pms.entity.BookingEngineSettings;
import in.aviqr.pms.entity.ChatConversation;
import in.aviqr.pms.repository.BookingEngineSettingsRepository;
import in.aviqr.pms.repository.ChatConversationRepository;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class WhatsAppServiceTest {
    final BookingEngineSettingsRepository settings = mock(BookingEngineSettingsRepository.class);
    final ChatConversationRepository conversations = mock(ChatConversationRepository.class);
    final BookingAssistant assistant = mock(BookingAssistant.class);
    final SecretBox box;
    final WhatsAppService service;
    final UUID hotel = UUID.randomUUID();
    final List<String[]> sent = new ArrayList<>();

    WhatsAppServiceTest() throws Exception {
        box = new SecretBox("test-internal-secret-0123456789abcdef");
        service = new WhatsAppService(settings, conversations, assistant, box, "app-secret", "verify-me", "http://127.0.0.1:9", "https://book.example") {
            @Override void send(String phoneNumberId, String token, String to, String text) { sent.add(new String[]{phoneNumberId, token, to, text}); }
        };
    }

    static String sign(byte[] body) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("app-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return "sha256=" + HexFormat.of().formatHex(mac.doFinal(body));
    }

    @Test
    void checksMetasSignatureAndSubscription() throws Exception {
        byte[] body = "{\"entry\":[]}".getBytes(StandardCharsets.UTF_8);
        assertThat(service.signed(body, sign(body))).isTrue();
        assertThat(service.signed("{\"entry\":[1]}".getBytes(StandardCharsets.UTF_8), sign(body))).isFalse();
        assertThat(service.signed(body, null)).isFalse();
        assertThat(service.verify("subscribe", "verify-me", "123")).contains("123");
        assertThat(service.verify("subscribe", "wrong", "123")).isEmpty();
    }

    @Test
    void repliesWithTheHotelsTokenAndRemembersTheChat() {
        BookingEngineSettings s = BookingEngineSettings.builder().hotelId(hotel).whatsappBotEnabled(true).whatsappPhoneNumberId("111")
            .whatsappAccessToken(box.seal("EAAG-token")).build();
        when(settings.findByWhatsappPhoneNumberId("111")).thenReturn(Optional.of(s));
        when(conversations.findByHotelIdAndContact(hotel, "919876543210")).thenReturn(Optional.empty());
        when(assistant.reply(eq(hotel), eq("https://book.example"), eq("WHATSAPP"), anyList())).thenReturn("We have rooms from INR 4,000.");
        service.handle("111", "919876543210", "Any rooms next Friday?");
        assertThat(sent).hasSize(1);
        assertThat(sent.get(0)).containsExactly("111", "EAAG-token", "919876543210", "We have rooms from INR 4,000.");
        verify(conversations).save(argThat((ChatConversation c) -> c.getTurns().contains("Any rooms next Friday?") && c.getTurns().contains("INR 4,000")));
    }

    @Test
    void ignoresUnknownNumbersAndDisabledBots() {
        when(settings.findByWhatsappPhoneNumberId("222")).thenReturn(Optional.of(BookingEngineSettings.builder().hotelId(hotel)
            .whatsappBotEnabled(false).whatsappPhoneNumberId("222").whatsappAccessToken(box.seal("t")).build()));
        service.handle("999", "1", "hi");
        service.handle("222", "1", "hi");
        assertThat(sent).isEmpty();
        verifyNoInteractions(assistant);
    }

    @Test
    void historyIsTrimmedAndStartsWithTheGuest() {
        List<BookingAssistant.Turn> turns = new ArrayList<>();
        turns.add(new BookingAssistant.Turn("assistant", "Hello!"));
        for (int i = 0; i < 30; i++) turns.add(new BookingAssistant.Turn(i % 2 == 0 ? "user" : "assistant", "x".repeat(2000)));
        turns.add(new BookingAssistant.Turn("user", "and breakfast?"));
        List<BookingAssistant.Turn> kept = BookingAssistant.trim(turns);
        assertThat(kept.get(0).role()).isEqualTo("user");
        assertThat(kept).hasSizeLessThanOrEqualTo(BookingAssistant.MAX_TURNS);
        assertThat(kept.get(kept.size() - 1).text()).endsWith("and breakfast?");
        assertThat(kept).allSatisfy(t -> assertThat(t.text().length()).isLessThanOrEqualTo(2 * BookingAssistant.MAX_CHARS + 1));
    }

    @Test
    void assistantIsOffWithoutAKey() {
        BookingAssistant off = new BookingAssistant(mock(BookingAssistantTools.class), mock(in.aviqr.pms.client.HotelServiceClient.class), "");
        assertThat(off.available()).isFalse();
        assertThat(off.reply(hotel, "https://x", "WEB", List.of(new BookingAssistant.Turn("user", "hi")))).contains("offline");
    }
}
