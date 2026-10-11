package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.BookingEngineSettings;
import in.aviqr.pms.repository.BookingEngineSettingsRepository;
import in.aviqr.pms.service.BookingAssistant;
import in.aviqr.pms.service.WhatsAppService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/** The booking assistant: website chat, the WhatsApp webhook, and what the booking page should show. */
@RestController @RequiredArgsConstructor
public class BookingAssistantController {
    private final BookingAssistant assistant;
    private final WhatsAppService whatsApp;
    private final BookingEngineSettingsRepository settingsRepo;
    private final HotelServiceClient hotelServiceClient;
    private final Map<String, Deque<Instant>> recent = new ConcurrentHashMap<>();

    /** Whether the booking page shows the chat and a WhatsApp button. */
    @GetMapping("/api/v1/pms/public/booking-engine/{hotelId}/assistant")
    public ResponseEntity<ApiResponse<Map<String, Object>>> info(@PathVariable UUID hotelId,
            @RequestParam(defaultValue="") String storefrontHost, @RequestParam(defaultValue="") String storefrontSlug) {
        requireAccess(hotelId, storefrontHost, storefrontSlug);
        BookingEngineSettings s = settingsRepo.findByHotelId(hotelId).orElse(null);
        Map<String, Object> out = new HashMap<>();
        out.put("chatEnabled", s != null && Boolean.TRUE.equals(s.getChatEnabled()) && assistant.available());
        out.put("whatsappNumber", s == null ? null : s.getWhatsappNumber());
        return ResponseEntity.ok(ApiResponse.ok(out));
    }

    /** One chat turn: the guest's conversation so far in, the assistant's reply out. The page keeps the
     *  conversation; 30 messages per caller per 10 minutes. Storefront host/slug travel in the (encrypted) body. */
    @PostMapping("/api/v1/pms/public/booking-engine/{hotelId}/chat")
    public ResponseEntity<ApiResponse<Map<String, String>>> chat(@PathVariable UUID hotelId, @RequestBody Map<String, Object> body,
            @RequestHeader(value="X-Forwarded-For", defaultValue="") String forwardedFor) {
        String host = Objects.toString(body.get("storefrontHost"), ""), slug = Objects.toString(body.get("storefrontSlug"), "");
        requireAccess(hotelId, host, slug);
        BookingEngineSettings s = settingsRepo.findByHotelId(hotelId).orElse(null);
        if (s == null || !Boolean.TRUE.equals(s.getChatEnabled()) || !assistant.available())
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("Chat isn't available for this hotel"));
        if (!allow(hotelId + "|" + forwardedFor.split(",")[0].trim()))
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(ApiResponse.error("You're sending messages quickly. Please wait a few minutes."));
        List<BookingAssistant.Turn> turns = new ArrayList<>();
        if (body.get("messages") instanceof List<?> list)
            for (Object o : list) if (o instanceof Map<?, ?> m) turns.add(new BookingAssistant.Turn(Objects.toString(m.get("role"), "user"), Objects.toString(m.get("text"), "")));
        if (turns.isEmpty() || !"user".equals(turns.get(turns.size() - 1).role()))
            return ResponseEntity.badRequest().body(ApiResponse.error("Send the guest's message last"));
        String base = host.isBlank() ? "https://bm.aviqr.com" : "https://" + host;
        return ResponseEntity.ok(ApiResponse.ok(Map.of("reply", assistant.reply(hotelId, base, "WEB", turns))));
    }

    @GetMapping(value="/api/v1/pms/public/whatsapp/webhook", produces=MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> verify(@RequestParam(name="hub.mode", required=false) String mode,
            @RequestParam(name="hub.verify_token", required=false) String token, @RequestParam(name="hub.challenge", required=false) String challenge) {
        return whatsApp.verify(mode, token, challenge).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.status(HttpStatus.FORBIDDEN).build());
    }

    @PostMapping("/api/v1/pms/public/whatsapp/webhook")
    public ResponseEntity<Void> webhook(@RequestBody byte[] body, @RequestHeader(value="X-Hub-Signature-256", required=false) String signature) {
        if (!whatsApp.signed(body, signature)) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        whatsApp.receive(body);
        return ResponseEntity.ok().build();
    }

    private void requireAccess(UUID hotelId, String host, String slug) {
        if (!hotelServiceClient.isBookingEnginePropertyAvailable(hotelId, host, slug)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }

    private boolean allow(String key) {
        Deque<Instant> calls = recent.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (calls) {
            while (!calls.isEmpty() && calls.peekFirst().isBefore(Instant.now().minusSeconds(600))) calls.pollFirst();
            if (calls.size() >= 30) return false;
            calls.addLast(Instant.now());
            return true;
        }
    }
}
