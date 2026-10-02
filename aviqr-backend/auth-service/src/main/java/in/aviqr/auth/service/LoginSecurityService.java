package in.aviqr.auth.service;

import in.aviqr.auth.entity.*;
import in.aviqr.auth.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import in.aviqr.auth.dto.DeviceInfo;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.LocalDateTime;
import java.util.*;

@Service @RequiredArgsConstructor
public class LoginSecurityService {
    private final LoginSecurityRepository records;
    private final OtpRepository otps;
    private final UserRepository users;
    private static final SecureRandom RANDOM = new SecureRandom();

    public static String randomToken() {
        byte[] bytes = new byte[32]; RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
    public static String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    public static void validatePassword(String password) {
        if (password==null || password.length()<12 || password.getBytes(StandardCharsets.UTF_8).length>72)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Password must contain at least 12 characters and at most 72 UTF-8 bytes");
    }
    public static boolean privileged(User user) { return user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.SUPPORT; }
    public static void requireActive(User user) {
        if (user.getStatus() != UserStatus.ACTIVE) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account is not active");
    }
    private String trim(String text, int max) { return text == null ? null : text.substring(0, Math.min(max, text.length())); }

    @Transactional(propagation=Propagation.REQUIRES_NEW)
    public void event(String email, String kind, String status, String reason, DeviceInfo device, String actor) {
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        records.save(LoginSecurityRecord.builder().email(normalized)
            .userId(users.findByEmail(normalized).map(User::getId).orElse(null))
            .kind(kind).status(status).reason(trim(reason,500)).actorId(actor)
            .ipAddress(trim(device.getIpAddress(),255)).userAgent(trim(device.getUserAgent(),500))
            .deviceId(trim(device.getDeviceId(),255)).createdAt(LocalDateTime.now()).build());
    }
    public void checkBlocked(String email, DeviceInfo device) {
        var since = LocalDateTime.now().minusMinutes(15);
        var accountSince = records.findFirstByEmailAndKindOrderByCreatedAtDesc(email,"LOGIN_UNBLOCK")
            .map(LoginSecurityRecord::getCreatedAt).filter(t -> t.isAfter(since)).orElse(since);
        boolean blocked = records.countByEmailAndKindAndCreatedAtAfter(email,"LOGIN_FAILURE",accountSince) >= 5 ||
            (device.getIpAddress() != null && records.countByIpAddressAndKindAndCreatedAtAfter(device.getIpAddress(),"LOGIN_FAILURE",since) >= 30);
        if (blocked) {
            event(email,"BLOCKED_LOGIN","BLOCKED","Too many failed attempts; retry after 15 minutes",device,null);
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Login temporarily blocked. Retry after 15 minutes.");
        }
    }
    @Transactional
    public String challenge(User user, DeviceInfo device) {
        String raw = randomToken();
        records.save(LoginSecurityRecord.builder().userId(user.getId()).email(user.getEmail())
            .kind("LOGIN_CHALLENGE").status("ACTIVE").tokenHash(hash(raw))
            .ipAddress(device.getIpAddress()).deviceId(device.getDeviceId())
            .createdAt(LocalDateTime.now()).expiresAt(LocalDateTime.now().plusMinutes(10)).build());
        return raw;
    }
    @Transactional
    public void consumeChallenge(String raw, String email) {
        if (raw == null || raw.isBlank()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sign in with password first");
        var record = records.findByTokenHashAndKindAndStatusAndExpiresAtAfter(hash(raw),"LOGIN_CHALLENGE","ACTIVE",LocalDateTime.now())
            .filter(r -> r.getEmail().equalsIgnoreCase(email))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid or expired login challenge"));
        record.setStatus("USED"); records.save(record);
    }
    @Transactional
    public boolean exempt(User user, DeviceInfo device) {
        if (privileged(user)) return false;
        if (records.existsByEmailAndKindAndStatusAndExpiresAtAfter(user.getEmail(),"OTP_EXEMPTION","ACTIVE",LocalDateTime.now())) return true;
        if (device.getTrustedDeviceToken() == null) return false;
        return records.findByTokenHashAndKindAndStatusAndExpiresAtAfter(hash(device.getTrustedDeviceToken()),"TRUSTED_DEVICE","ACTIVE",LocalDateTime.now())
            .filter(r -> user.getId().equals(r.getUserId())).isPresent();
    }
    @Transactional
    public String trustDevice(User user, DeviceInfo device) {
        if (privileged(user)) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Privileged accounts always require OTP");
        String raw = randomToken();
        records.save(LoginSecurityRecord.builder().userId(user.getId()).email(user.getEmail())
            .kind("TRUSTED_DEVICE").status("ACTIVE").tokenHash(hash(raw))
            .reason("Registered after OTP verification").deviceId(trim(device.getDeviceId(),255))
            .userAgent(trim(device.getUserAgent(),500)).ipAddress(trim(device.getIpAddress(),255))
            .createdAt(LocalDateTime.now()).expiresAt(LocalDateTime.now().plusDays(30)).build());
        return raw;
    }
    @Transactional
    public void revokeGrants(UUID userId) {
        for (String kind : List.of("TRUSTED_DEVICE","LOGIN_CHALLENGE","OTP_EXEMPTION")) {
            for (var grant : records.findByUserIdAndKindAndStatus(userId,kind,"ACTIVE")) {
                grant.setStatus("REVOKED"); records.save(grant);
            }
        }
    }
}
