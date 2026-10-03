package in.aviqr.shop.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

/** Encrypts tenant payment and notification credentials in the database using AES-GCM. */
@Converter
public class RazorpaySecretConverter implements AttributeConverter<String, String> {
    private static final String PREFIX = "enc:v1:";
    private static final int NONCE_LENGTH = 12;
    private static final SecureRandom RANDOM = new SecureRandom();

    @Override
    public String convertToDatabaseColumn(String value) {
        if (value == null || value.isBlank()) return value;
        try {
            byte[] nonce = new byte[NONCE_LENGTH];
            RANDOM.nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key(), new GCMParameterSpec(128, nonce));
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            byte[] packed = Arrays.copyOf(nonce, nonce.length + encrypted.length);
            System.arraycopy(encrypted, 0, packed, nonce.length, encrypted.length);
            return PREFIX + Base64.getEncoder().encodeToString(packed);
        } catch (Exception e) {
            throw new IllegalStateException("Could not encrypt tenant credentials", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String value) {
        if (value == null || !value.startsWith(PREFIX)) return value; // supports existing plaintext values during migration
        try {
            byte[] packed = Base64.getDecoder().decode(value.substring(PREFIX.length()));
            if (packed.length <= NONCE_LENGTH) throw new IllegalArgumentException("Invalid encrypted credential");
            byte[] nonce = Arrays.copyOfRange(packed, 0, NONCE_LENGTH);
            byte[] encrypted = Arrays.copyOfRange(packed, NONCE_LENGTH, packed.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, nonce));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Could not decrypt tenant credentials; verify INTERNAL_SYNC_SECRET", e);
        }
    }

    protected String encryptionSecret() { return System.getenv("INTERNAL_SYNC_SECRET"); }

    private SecretKeySpec key() throws Exception {
        String secret = encryptionSecret();
        if (secret == null || secret.length() < 32)
            throw new IllegalStateException("INTERNAL_SYNC_SECRET must be set to encrypt tenant credentials");
        return new SecretKeySpec(MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8)), "AES");
    }
}
