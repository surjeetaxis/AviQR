package in.aviqr.pms.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.UUID;

/** Unguessable per-reservation tokens for voucher links, so a voucher URL works
 *  without putting the guest's phone in it. Derived from the internal secret, so
 *  they survive restarts and match across instances; without one, a per-process
 *  key is used and links last until the next restart. */
@Component
public class VoucherTokens {
    private final byte[] key;

    public VoucherTokens(@Value("${internal.sync.secret:}") String secret) throws Exception {
        if (secret.isBlank()) {
            key = new byte[32];
            new SecureRandom().nextBytes(key);
        } else {
            key = hmac(secret.getBytes(StandardCharsets.UTF_8), "aviqr-booking-voucher-v1");
        }
    }

    public String tokenFor(UUID reservationId) {
        try {
            return Base64.getUrlEncoder().withoutPadding().encodeToString(Arrays.copyOf(hmac(key, reservationId.toString()), 18));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public boolean matches(UUID reservationId, String token) {
        return token != null && MessageDigest.isEqual(tokenFor(reservationId).getBytes(StandardCharsets.US_ASCII), token.getBytes(StandardCharsets.US_ASCII));
    }

    private static byte[] hmac(byte[] key, String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
    }
}
