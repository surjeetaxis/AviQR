package in.aviqr.shop.security;

import org.junit.jupiter.api.Test;
import java.util.Base64;
import static org.assertj.core.api.Assertions.*;

class CredentialEncryptionTest {
    private final RazorpaySecretConverter converter = new RazorpaySecretConverter() {
        @Override protected String encryptionSecret() { return "test-only-encryption-key-32-characters"; }
    };
    @Test void encryptsCredentialsWithFreshNoncesAndSupportsLegacyReads() {
        String secret="test-only ₹ café";
        String encrypted=converter.convertToDatabaseColumn(secret);
        assertThat(encrypted).startsWith("enc:v1:").doesNotContain(secret);
        assertThat(converter.convertToEntityAttribute(encrypted)).isEqualTo(secret);
        assertThat(converter.convertToDatabaseColumn(secret)).isNotEqualTo(encrypted);
        assertThat(converter.convertToEntityAttribute(secret)).isEqualTo(secret);
    }
    @Test void tamperingFailsClosed() {
        String encrypted=converter.convertToDatabaseColumn("test-only");
        byte[] packed=Base64.getDecoder().decode(encrypted.substring(7));packed[packed.length-1]^=1;
        assertThatThrownBy(() -> converter.convertToEntityAttribute("enc:v1:"+Base64.getEncoder().encodeToString(packed))).isInstanceOf(IllegalStateException.class);
    }
    @Test void wrongKeyFailsClosed() {
        var wrong=new RazorpaySecretConverter() { @Override protected String encryptionSecret() {return "another-test-only-encryption-key-32-characters";} };
        String encrypted=converter.convertToDatabaseColumn("test-only");
        assertThatThrownBy(() -> wrong.convertToEntityAttribute(encrypted)).isInstanceOf(IllegalStateException.class);
    }
}
