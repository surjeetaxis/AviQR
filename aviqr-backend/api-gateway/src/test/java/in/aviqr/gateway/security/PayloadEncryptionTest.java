package in.aviqr.gateway.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.MGF1ParameterSpec;
import java.time.Instant;
import java.util.*;
import javax.crypto.Cipher;
import javax.crypto.spec.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class PayloadEncryptionTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private KeyPair keys;
    private PayloadEncryption service;
    @BeforeEach void setup() throws Exception {
        var generator = KeyPairGenerator.getInstance("RSA"); generator.initialize(2048); keys = generator.generateKeyPair();
        service = new PayloadEncryption(mapper, Base64.getEncoder().encodeToString(keys.getPrivate().getEncoded()), true);
    }
    private String encrypt(long iat, String kid) throws Exception {
        var encoder = Base64.getUrlEncoder().withoutPadding();
        String header = encoder.encodeToString(mapper.writeValueAsBytes(Map.of("alg", "RSA-OAEP-256", "enc", "A256GCM", "kid", kid)));
        byte[] key = new byte[32], iv = new byte[12]; new SecureRandom().nextBytes(key); new SecureRandom().nextBytes(iv);
        var rsa = Cipher.getInstance("RSA/ECB/OAEPPadding");
        rsa.init(Cipher.ENCRYPT_MODE, keys.getPublic(), new OAEPParameterSpec("SHA-256", "MGF1", MGF1ParameterSpec.SHA256, PSource.PSpecified.DEFAULT));
        var aes = Cipher.getInstance("AES/GCM/NoPadding"); aes.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key,"AES"), new GCMParameterSpec(128,iv)); aes.updateAAD(header.getBytes(StandardCharsets.US_ASCII));
        byte[] result = aes.doFinal(mapper.writeValueAsBytes(Map.of("iat",iat,"jti","abcdefghijklmnopqrstuv","method","POST","target","/api/v1/auth/login","body",Map.of("password","test-only","note","₹ café"))));
        return String.join(".",header,encoder.encodeToString(rsa.doFinal(key)),encoder.encodeToString(iv),encoder.encodeToString(Arrays.copyOf(result,result.length-16)),encoder.encodeToString(Arrays.copyOfRange(result,result.length-16,result.length)));
    }
    private String valid() throws Exception { return encrypt(Instant.now().getEpochSecond(), service.publicConfig().get("kid")); }
    @Test void decryptsAuthenticatedJson() throws Exception {
        String compact = valid();
        assertThat(compact).doesNotContain("test-only");
        assertThat(service.decrypt(compact,"POST","/api/v1/auth/login").path("body").path("note").asText()).isEqualTo("₹ café");
    }
    @Test void rejectsTampering() throws Exception {
        var parts = valid().split("\\."); byte[] ciphertext = Base64.getUrlDecoder().decode(parts[3]); ciphertext[0] ^= 1; parts[3] = Base64.getUrlEncoder().withoutPadding().encodeToString(ciphertext);
        assertThatThrownBy(() -> service.decrypt(String.join(".",parts),"POST","/api/v1/auth/login")).isInstanceOf(Exception.class);
    }
    @Test void rejectsExpiredAndFutureRequests() throws Exception {
        for (long offset : new long[]{-121,31}) {
            String compact = encrypt(Instant.now().getEpochSecond()+offset,service.publicConfig().get("kid"));
            assertThatThrownBy(() -> service.decrypt(compact,"POST","/api/v1/auth/login")).isInstanceOf(IllegalArgumentException.class);
        }
    }
    @Test void rejectsDifferentMethodPathOrKey() throws Exception {
        String compact = valid();
        assertThatThrownBy(() -> service.decrypt(compact,"PUT","/api/v1/auth/login")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.decrypt(compact,"POST","/api/v1/auth/reset-password")).isInstanceOf(IllegalArgumentException.class);
        String wrongKey = encrypt(Instant.now().getEpochSecond(),"wrong-key");
        assertThatThrownBy(() -> service.decrypt(wrongKey,"POST","/api/v1/auth/login")).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void decryptsWebCryptoInteroperabilityVector() throws Exception {
        // This private key is a disposable test fixture, never used by a service.
        try (var input = getClass().getResourceAsStream("/payload-jwe-test-vector.json")) {
            var vector = mapper.readTree(input);
            var crypto = new PayloadEncryption(mapper,vector.path("privateKey").asText(),true);
            org.springframework.test.util.ReflectionTestUtils.setField(crypto,"clock",java.time.Clock.fixed(Instant.ofEpochSecond(vector.path("iat").asLong()),java.time.ZoneOffset.UTC));
            var decrypted=crypto.decrypt(vector.path("jwe").asText(),"POST","/api/v1/auth/login");
            assertThat(decrypted.path("body").path("note").asText()).isEqualTo("Unicode ₹ café");
            assertThat(decrypted.path("body").path("password").asText()).isEqualTo("test-only-password");
        }
    }
    @Test void productionRequiresProvisionedKey() {
        assertThatThrownBy(() -> new PayloadEncryption(mapper,"",true)).isInstanceOf(IllegalStateException.class);
    }
}
