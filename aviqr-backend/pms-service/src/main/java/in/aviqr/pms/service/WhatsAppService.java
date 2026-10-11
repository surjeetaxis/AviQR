package in.aviqr.pms.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.aviqr.pms.entity.BookingEngineSettings;
import in.aviqr.pms.entity.ChatConversation;
import in.aviqr.pms.repository.BookingEngineSettingsRepository;
import in.aviqr.pms.repository.ChatConversationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * WhatsApp Cloud API: guests message a hotel's WhatsApp Business number and the booking assistant
 * replies. Webhooks are verified with the Meta app secret; each hotel's number (phone number id)
 * maps to its settings, where its access token is stored encrypted. A conversation remembers the
 * last 20 turns for 24 hours. Each guest gets 20 messages per 10 minutes.
 */
@Service @Slf4j
public class WhatsAppService {
    static final int MAX_PER_WINDOW = 20;

    private final BookingEngineSettingsRepository settingsRepo;
    private final ChatConversationRepository conversations;
    private final BookingAssistant assistant;
    private final SecretBox secretBox;
    private final ObjectMapper mapper = new ObjectMapper();
    private final RestClient graph;
    private final String appSecret, verifyToken, storefrontBase;
    private final ExecutorService workers = Executors.newFixedThreadPool(4);
    private final Set<String> seen = Collections.newSetFromMap(Collections.synchronizedMap(new LinkedHashMap<>(256, 0.75f, false) {
        protected boolean removeEldestEntry(Map.Entry<String, Boolean> e) { return size() > 5000; }
    }));
    private final Map<String, Deque<Instant>> recent = new ConcurrentHashMap<>();

    public WhatsAppService(BookingEngineSettingsRepository settingsRepo, ChatConversationRepository conversations, BookingAssistant assistant,
                           SecretBox secretBox, @Value("${whatsapp.app-secret:}") String appSecret, @Value("${whatsapp.verify-token:}") String verifyToken,
                           @Value("${whatsapp.graph-url:https://graph.facebook.com/v23.0}") String graphUrl,
                           @Value("${booking.engine.public-url:https://bm.aviqr.com}") String storefrontBase) {
        this.settingsRepo = settingsRepo;
        this.conversations = conversations;
        this.assistant = assistant;
        this.secretBox = secretBox;
        this.appSecret = appSecret;
        this.verifyToken = verifyToken;
        this.storefrontBase = storefrontBase;
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(5000);
        f.setReadTimeout(15000);
        this.graph = RestClient.builder().baseUrl(graphUrl).requestFactory(f).build();
    }

    /** Meta's webhook subscription check. */
    public Optional<String> verify(String mode, String token, String challenge) {
        boolean ok = "subscribe".equals(mode) && !verifyToken.isBlank() && token != null
            && MessageDigest.isEqual(verifyToken.getBytes(StandardCharsets.UTF_8), token.getBytes(StandardCharsets.UTF_8));
        return ok ? Optional.ofNullable(challenge) : Optional.empty();
    }

    /** X-Hub-Signature-256 is HMAC-SHA256 of the raw body with the app secret. */
    public boolean signed(byte[] body, String header) {
        if (appSecret.isBlank() || header == null || !header.startsWith("sha256=")) return false;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(appSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String expected = HexFormat.of().formatHex(mac.doFinal(body));
            return MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII), header.substring(7).toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII));
        } catch (Exception e) {
            return false;
        }
    }

    /** Queues a reply to every new text message in a verified webhook; Meta gets its 200 straight away. */
    public void receive(byte[] body) {
        JsonNode root;
        try { root = mapper.readTree(body); } catch (Exception e) { return; }
        for (JsonNode entry : root.path("entry"))
            for (JsonNode change : entry.path("changes")) {
                JsonNode value = change.path("value");
                String phoneNumberId = value.path("metadata").path("phone_number_id").asText(null);
                for (JsonNode msg : value.path("messages")) {
                    String id = msg.path("id").asText(""), from = msg.path("from").asText("");
                    if (id.isEmpty() || from.isEmpty() || !seen.add(id)) continue; // Meta retries deliveries
                    String text = "text".equals(msg.path("type").asText()) ? msg.path("text").path("body").asText("") : null;
                    workers.submit(() -> handle(phoneNumberId, from, text));
                }
            }
    }

    void handle(String phoneNumberId, String from, String text) {
        BookingEngineSettings s = phoneNumberId == null ? null : settingsRepo.findByWhatsappPhoneNumberId(phoneNumberId).orElse(null);
        if (s == null || !Boolean.TRUE.equals(s.getWhatsappBotEnabled()) || !s.isWhatsappTokenSet()) return;
        String token = secretBox.open(s.getWhatsappAccessToken());
        if (!allow(s.getHotelId() + "|" + from)) return;
        if (text == null || text.isBlank()) {
            send(phoneNumberId, token, from, "Thanks! I can only read text messages. What dates are you looking at?");
            return;
        }
        ChatConversation convo = conversations.findByHotelIdAndContact(s.getHotelId(), from)
            .orElseGet(() -> ChatConversation.builder().hotelId(s.getHotelId()).contact(from).build());
        List<BookingAssistant.Turn> turns = convo.getUpdatedAt() != null && convo.getUpdatedAt().isAfter(LocalDateTime.now().minusHours(24))
            ? read(convo.getTurns()) : new ArrayList<>();
        turns.add(new BookingAssistant.Turn("user", text));
        String reply = assistant.reply(s.getHotelId(), storefrontBase, "WHATSAPP", turns);
        turns.add(new BookingAssistant.Turn("assistant", reply));
        convo.setTurns(write(turns.subList(Math.max(0, turns.size() - BookingAssistant.MAX_TURNS), turns.size())));
        convo.setUpdatedAt(LocalDateTime.now());
        conversations.save(convo);
        send(phoneNumberId, token, from, reply);
    }

    void send(String phoneNumberId, String token, String to, String text) {
        try {
            graph.post().uri("/{id}/messages", phoneNumberId).contentType(MediaType.APPLICATION_JSON).header("Authorization", "Bearer " + token)
                .body(Map.of("messaging_product", "whatsapp", "to", to, "type", "text",
                    "text", Map.of("preview_url", true, "body", text.length() > 4000 ? text.substring(0, 4000) : text)))
                .retrieve().toBodilessEntity();
        } catch (Exception e) {
            log.warn("WhatsApp reply via {} failed: {}", phoneNumberId, e.getMessage());
        }
    }

    private boolean allow(String key) {
        Deque<Instant> calls = recent.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (calls) {
            while (!calls.isEmpty() && calls.peekFirst().isBefore(Instant.now().minusSeconds(600))) calls.pollFirst();
            if (calls.size() >= MAX_PER_WINDOW) return false;
            calls.addLast(Instant.now());
            return true;
        }
    }

    private List<BookingAssistant.Turn> read(String json) {
        try { return json == null ? new ArrayList<>() : new ArrayList<>(mapper.readValue(json, new TypeReference<List<BookingAssistant.Turn>>() {})); }
        catch (Exception e) { return new ArrayList<>(); }
    }

    private String write(List<BookingAssistant.Turn> turns) {
        try { return mapper.writeValueAsString(turns); } catch (Exception e) { return "[]"; }
    }
}
