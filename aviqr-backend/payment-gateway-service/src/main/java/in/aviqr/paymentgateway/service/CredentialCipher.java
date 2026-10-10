package in.aviqr.paymentgateway.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/** AES-256-GCM for hotels' gateway credentials and per-transaction gateway state. */
@Component
public class CredentialCipher {
    private static final int IV_BYTES = 12;
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();
    private final ObjectMapper mapper = new ObjectMapper();

    public CredentialCipher(@Value("${payment-gateway.credential-key:}") String base64Key) {
        byte[] raw;
        try { raw = Base64.getDecoder().decode(base64Key.trim()); }
        catch (IllegalArgumentException e) { raw = new byte[0]; }
        if (raw.length != 32) throw new IllegalStateException("PAYMENT_GATEWAY_CREDENTIAL_KEY must be 32 random bytes, base64-encoded (openssl rand -base64 32)");
        this.key = new SecretKeySpec(raw, "AES");
    }

    public String seal(Map<String, String> values) {
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
            byte[] sealed = cipher.doFinal(mapper.writeValueAsBytes(values));
            return Base64.getEncoder().encodeToString(ByteBuffer.allocate(iv.length + sealed.length).put(iv).put(sealed).array());
        } catch (Exception e) {
            throw new IllegalStateException("Could not encrypt gateway settings", e);
        }
    }

    public Map<String, String> open(String sealed) {
        if (sealed == null || sealed.isBlank()) return new LinkedHashMap<>();
        try {
            byte[] all = Base64.getDecoder().decode(sealed);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, all, 0, IV_BYTES));
            byte[] plain = cipher.doFinal(all, IV_BYTES, all.length - IV_BYTES);
            return mapper.readValue(new String(plain, StandardCharsets.UTF_8), new TypeReference<LinkedHashMap<String, String>>() {});
        } catch (Exception e) {
            throw new IllegalStateException("Could not decrypt gateway settings; was PAYMENT_GATEWAY_CREDENTIAL_KEY changed?", e);
        }
    }
}
