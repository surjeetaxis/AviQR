package in.aviqr.pms.service;

import in.aviqr.pms.client.NotificationClient;
import in.aviqr.pms.entity.Guest;
import in.aviqr.pms.entity.LoyaltyProgramConfig;
import in.aviqr.pms.repository.GuestRepository;
import in.aviqr.pms.repository.LoyaltyProgramConfigRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Loyalty points on the booking engine. Anyone can see what a stay would earn; spending points
 * needs proof the guest owns them: a 6-digit code emailed to the address on their guest profile.
 * The code isn't stored: the guest gets a signed challenge, so verification works on any
 * instance. Codes last 10 minutes and allow 5 tries; a phone gets 3 codes per 15 minutes.
 */
@Service @Slf4j
public class BookingLoyaltyService {
    static final long CODE_SECONDS = 600, MEMBER_SECONDS = 3600;
    static final int MAX_TRIES = 5, MAX_SENDS = 3;

    private final LoyaltyProgramConfigRepository configRepo;
    private final GuestRepository guestRepo;
    private final NotificationClient notifications;
    private final byte[] key;
    private final SecureRandom random = new SecureRandom();
    private final Map<String, Integer> tries = new ConcurrentHashMap<>();
    private final Map<String, Deque<Instant>> sends = new ConcurrentHashMap<>();

    public BookingLoyaltyService(LoyaltyProgramConfigRepository configRepo, GuestRepository guestRepo, NotificationClient notifications,
                                 @Value("${internal.sync.secret:}") String secret) {
        this.configRepo = configRepo;
        this.guestRepo = guestRepo;
        this.notifications = notifications;
        byte[] k = new byte[32];
        if (secret.isBlank()) random.nextBytes(k); else k = hmac(secret.getBytes(StandardCharsets.UTF_8), "aviqr-booking-loyalty-v1");
        this.key = k;
    }

    public record Program(boolean active, BigDecimal earnRatePercent, BigDecimal redemptionValue) { }
    public record CodeSent(String challenge, String emailHint) { }
    public record Member(String token, int points, BigDecimal pointValue) { }

    public Program program(UUID hotelId) {
        return configRepo.findByHotelId(hotelId).filter(c -> Boolean.TRUE.equals(c.getActive()))
            .map(c -> new Program(true, c.getEarnRatePercent(), c.getRedemptionValue()))
            .orElse(new Program(false, BigDecimal.ZERO, BigDecimal.ONE));
    }

    /** Emails a code when this phone has points and an email on file. Empty means nothing was sent;
     *  callers show the same message either way so phone numbers can't be probed. */
    public Optional<CodeSent> sendCode(UUID hotelId, String phone) {
        if (!program(hotelId).active()) return Optional.empty();
        Guest guest = member(hotelId, phone).orElse(null);
        if (guest == null || guest.getEmail() == null || guest.getEmail().isBlank()) return Optional.empty();
        if (!allowSend(hotelId + "|" + digits(phone))) throw new IllegalStateException("Too many codes requested. Please wait 15 minutes.");
        String code = String.format("%06d", random.nextInt(1_000_000));
        long exp = Instant.now().getEpochSecond() + CODE_SECONDS;
        String body = hotelId + "|" + digits(phone) + "|" + exp;
        String challenge = b64(body) + "." + sign(body + "|" + code);
        boolean sent = notifications.sendEmail(guest.getEmail(), "Your loyalty points code: " + code,
            "<p>Use this code to spend your loyalty points on your booking:</p><p style=\"font-size:24px;font-weight:700;letter-spacing:4px\">"
                + HtmlUtils.htmlEscape(code) + "</p><p>It expires in 10 minutes. If you didn't ask for it, you can ignore this email.</p>");
        return sent ? Optional.of(new CodeSent(challenge, BookingVoucherService.maskEmail(guest.getEmail()))) : Optional.empty();
    }

    /** Checks the emailed code; on success returns a token that lets this booking spend the guest's points. */
    public Optional<Member> verify(UUID hotelId, String phone, String challenge, String code) {
        if (challenge == null || code == null || !challenge.contains(".")) return Optional.empty();
        String body = unb64(challenge.substring(0, challenge.indexOf('.')));
        String[] parts = body == null ? new String[0] : body.split("\\|");
        if (parts.length != 3 || !parts[0].equals(hotelId.toString()) || !parts[1].equals(digits(phone))) return Optional.empty();
        if (Long.parseLong(parts[2]) < Instant.now().getEpochSecond()) return Optional.empty();
        if (tries.merge(challenge, 1, Integer::sum) > MAX_TRIES) return Optional.empty();
        if (!same(sign(body + "|" + code.trim()), challenge.substring(challenge.indexOf('.') + 1))) return Optional.empty();
        tries.remove(challenge);
        return member(hotelId, phone).map(g -> {
            String t = hotelId + "|" + g.getId() + "|" + (Instant.now().getEpochSecond() + MEMBER_SECONDS);
            return new Member(b64(t) + "." + sign(t), points(g), program(hotelId).redemptionValue());
        });
    }

    /** The guest a member token belongs to, if it's valid for this hotel and unexpired. */
    public Optional<Guest> guestFor(UUID hotelId, String token) {
        if (token == null || !token.contains(".")) return Optional.empty();
        String body = unb64(token.substring(0, token.indexOf('.')));
        if (body == null || !same(sign(body), token.substring(token.indexOf('.') + 1))) return Optional.empty();
        String[] p = body.split("\\|");
        if (p.length != 3 || !p[0].equals(hotelId.toString()) || Long.parseLong(p[2]) < Instant.now().getEpochSecond()) return Optional.empty();
        return guestRepo.findById(UUID.fromString(p[1])).filter(g -> hotelId.equals(g.getHotelId()));
    }

    /** Spends exactly this many points; returns their value. */
    @Transactional
    public BigDecimal redeem(UUID hotelId, Guest guest, int points) {
        Program program = program(hotelId);
        if (!program.active()) throw new IllegalArgumentException("This hotel's loyalty program is off");
        Guest fresh = guestRepo.findById(guest.getId()).orElseThrow();
        if (points <= 0 || points > points(fresh)) throw new IllegalArgumentException("You have " + points(fresh) + " points");
        fresh.setLoyaltyPoints(points(fresh) - points);
        guestRepo.save(fresh);
        return program.redemptionValue().multiply(BigDecimal.valueOf(points)).setScale(2, RoundingMode.DOWN);
    }

    /** Points a stay's room revenue would earn at checkout. */
    public int pointsFor(UUID hotelId, BigDecimal roomRevenue) {
        Program p = program(hotelId);
        if (!p.active() || roomRevenue == null) return 0;
        return roomRevenue.multiply(p.earnRatePercent()).divide(BigDecimal.valueOf(100), 0, RoundingMode.DOWN).intValue();
    }

    /** The hotel's guest with this phone (compared on its last 10 digits) and the most points. */
    Optional<Guest> member(UUID hotelId, String phone) {
        String d = digits(phone);
        if (d.length() < 7) return Optional.empty();
        return guestRepo.findByHotelIdAndPhoneContaining(hotelId, d.substring(d.length() - 4)).stream()
            .filter(g -> digits(g.getPhone()).equals(d))
            .max(Comparator.comparingInt(BookingLoyaltyService::points));
    }

    private boolean allowSend(String key) {
        Deque<Instant> recent = sends.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (recent) {
            Instant cutoff = Instant.now().minusSeconds(900);
            while (!recent.isEmpty() && recent.peekFirst().isBefore(cutoff)) recent.pollFirst();
            if (recent.size() >= MAX_SENDS) return false;
            recent.addLast(Instant.now());
            return true;
        }
    }

    static int points(Guest g) { return g.getLoyaltyPoints() == null ? 0 : g.getLoyaltyPoints(); }

    /** Last 10 digits, so "+91 98765 43210" and "9876543210" match. */
    static String digits(String phone) {
        String d = phone == null ? "" : phone.replaceAll("[^0-9]", "");
        return d.length() > 10 ? d.substring(d.length() - 10) : d;
    }

    private String sign(String data) { return Base64.getUrlEncoder().withoutPadding().encodeToString(hmac(key, data)); }
    private static String b64(String s) { return Base64.getUrlEncoder().withoutPadding().encodeToString(s.getBytes(StandardCharsets.UTF_8)); }
    private static String unb64(String s) {
        try { return new String(Base64.getUrlDecoder().decode(s), StandardCharsets.UTF_8); } catch (IllegalArgumentException e) { return null; }
    }
    private static boolean same(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.US_ASCII), b.getBytes(StandardCharsets.US_ASCII));
    }
    private static byte[] hmac(byte[] key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
