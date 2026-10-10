package in.aviqr.paymentgateway.service;

import org.junit.jupiter.api.Test;

import java.util.Base64;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

class CredentialCipherTest {
    static final String KEY = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";

    @Test
    void roundTripsAndHidesValues() {
        CredentialCipher cipher = new CredentialCipher(KEY);
        String sealed = cipher.seal(Map.of("keySecret", "s3cr3t"));
        assertThat(sealed).doesNotContain("s3cr3t");
        assertThat(cipher.open(sealed)).containsEntry("keySecret", "s3cr3t");
        assertThat(cipher.seal(Map.of("a", "b"))).isNotEqualTo(cipher.seal(Map.of("a", "b")));
    }

    @Test
    void rejectsTamperingAndWeakKeys() {
        CredentialCipher cipher = new CredentialCipher(KEY);
        byte[] raw = Base64.getDecoder().decode(cipher.seal(Map.of("a", "b")));
        raw[raw.length - 1] ^= 1;
        assertThatThrownBy(() -> cipher.open(Base64.getEncoder().encodeToString(raw))).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new CredentialCipher("")).isInstanceOf(IllegalStateException.class);
    }
}
