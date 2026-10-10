package in.aviqr.pms.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/** AES-256-GCM for third-party credentials a hotel saves (its WhatsApp access token), keyed from
 *  the internal secret so every instance can read them. */
@Component
public class SecretBox {
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public SecretBox(@Value("${internal.sync.secret:}") String secret) throws Exception {
        byte[] k = new byte[32];
        if (secret.isBlank()) random.nextBytes(k);
        else {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            k = mac.doFinal("aviqr-pms-secret-box-v1".getBytes(StandardCharsets.UTF_8));
        }
        key = new SecretKeySpec(k, "AES");
    }

    public String seal(String plain) {
        try {
            byte[] iv = new byte[12];
            random.nextBytes(iv);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
            byte[] enc = c.doFinal(plain.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(ByteBuffer.allocate(12 + enc.length).put(iv).put(enc).array());
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public String open(String sealed) {
        try {
            byte[] all = Base64.getDecoder().decode(sealed);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, all, 0, 12));
            return new String(c.doFinal(all, 12, all.length - 12), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Saved credential can't be read; was INTERNAL_SYNC_SECRET changed?", e);
        }
    }
}
