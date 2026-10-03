package in.aviqr.gateway.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.interfaces.RSAPrivateCrtKey;
import java.security.spec.*;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import javax.crypto.Cipher;
import javax.crypto.spec.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Compact JWE: RSA-OAEP-256 / A256GCM, with authenticated request binding. */
@Component
public class PayloadEncryption {
    private final ObjectMapper mapper;
    private final PrivateKey privateKey;
    private final String publicPem;
    private final String kid;
    private java.time.Clock clock = java.time.Clock.systemUTC();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    public PayloadEncryption(ObjectMapper mapper,
            @Value("${app.payload.private-key:${PAYLOAD_ENCRYPTION_PRIVATE_KEY:}}") String encodedKey,
            @Value("${app.payload.require-provisioned-key:${app.payload.require-encrypted:false}}") boolean required) throws Exception {
        this.mapper = mapper;
        var factory = KeyFactory.getInstance("RSA");
        PublicKey publicKey;
        if (encodedKey.isBlank()) {
            if (required) throw new IllegalStateException("PAYLOAD_ENCRYPTION_PRIVATE_KEY is required (base64 PKCS8 RSA private key)");
            var generator = KeyPairGenerator.getInstance("RSA"); generator.initialize(2048);
            var pair = generator.generateKeyPair(); privateKey = pair.getPrivate(); publicKey = pair.getPublic();
        } else {
            privateKey = factory.generatePrivate(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(encodedKey)));
            var rsa = (RSAPrivateCrtKey) privateKey;
            if (rsa.getModulus().bitLength() < 2048) throw new IllegalArgumentException("RSA key must be at least 2048 bits");
            publicKey = factory.generatePublic(new RSAPublicKeySpec(rsa.getModulus(), rsa.getPublicExponent()));
        }
        publicPem = "-----BEGIN PUBLIC KEY-----\n" + Base64.getMimeEncoder(64, new byte[]{'\n'}).encodeToString(publicKey.getEncoded()) + "\n-----END PUBLIC KEY-----";
        kid = Base64.getUrlEncoder().withoutPadding().encodeToString(MessageDigest.getInstance("SHA-256").digest(publicKey.getEncoded()));
    }
    public Map<String, String> publicConfig() { return Map.of("kid", kid, "publicKey", publicPem, "alg", "RSA-OAEP-256", "enc", "A256GCM"); }
    public JsonNode decrypt(String compact, String method, String target) throws Exception {
        String[] parts = compact.split("\\.", -1);
        if (parts.length != 5) throw new IllegalArgumentException("Invalid JWE");
        JsonNode header = mapper.readTree(DECODER.decode(parts[0]));
        if (!"RSA-OAEP-256".equals(header.path("alg").asText()) || !"A256GCM".equals(header.path("enc").asText()) || !kid.equals(header.path("kid").asText()) || header.has("zip") || header.has("crit"))
            throw new IllegalArgumentException("Unsupported JWE");
        var rsa = Cipher.getInstance("RSA/ECB/OAEPPadding");
        rsa.init(Cipher.DECRYPT_MODE, privateKey, new OAEPParameterSpec("SHA-256", "MGF1", MGF1ParameterSpec.SHA256, PSource.PSpecified.DEFAULT));
        byte[] key = rsa.doFinal(DECODER.decode(parts[1]));
        byte[] iv = DECODER.decode(parts[2]); byte[] tag = DECODER.decode(parts[4]);
        if (key.length != 32 || iv.length != 12 || tag.length != 16) throw new IllegalArgumentException("Invalid JWE parameters");
        byte[] ciphertext = DECODER.decode(parts[3]); byte[] packed = java.util.Arrays.copyOf(ciphertext, ciphertext.length + tag.length);
        System.arraycopy(tag, 0, packed, ciphertext.length, tag.length);
        var aes = Cipher.getInstance("AES/GCM/NoPadding");
        aes.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
        aes.updateAAD(parts[0].getBytes(StandardCharsets.US_ASCII));
        JsonNode payload = mapper.readTree(aes.doFinal(packed));
        long age = clock.instant().getEpochSecond() - payload.path("iat").asLong(0);
        if (age < -30 || age > 120 || !method.equals(payload.path("method").asText()) || !target.equals(payload.path("target").asText()) || !payload.path("jti").asText().matches("[A-Za-z0-9_-]{22,64}") || !payload.has("body"))
            throw new IllegalArgumentException("Invalid request binding");
        return payload;
    }
}
