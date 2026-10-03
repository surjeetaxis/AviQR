package in.aviqr.shop.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.aviqr.shop.entity.ShopSettings;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class SettingsSecretSerializationTest {
    @Test void secretsCanBeSubmittedButAreNeverReturned() throws Exception {
        var mapper = new ObjectMapper();
        String input = "{\"smtpPassword\":\"smtp-secret\",\"twilioToken\":\"sms-secret\",\"whatsappApiKey\":\"wa-secret\",\"fcmServerKey\":\"push-secret\",\"razorpayKeySecret\":\"payment-secret\",\"razorpayWebhookSecret\":\"webhook-secret\",\"smtpHost\":\"mail.example\"}";
        var settings = mapper.readValue(input, ShopSettings.class);
        assertThat(settings.getSmtpPassword()).isEqualTo("smtp-secret");
        assertThat(settings.getTwilioToken()).isEqualTo("sms-secret");
        assertThat(settings.getWhatsappApiKey()).isEqualTo("wa-secret");
        assertThat(settings.getFcmServerKey()).isEqualTo("push-secret");
        var output = mapper.readTree(mapper.writeValueAsString(settings));
        for (String field : new String[]{"smtpPassword", "twilioToken", "whatsappApiKey", "fcmServerKey", "razorpayKeySecret", "razorpayWebhookSecret"})
            assertThat(output.has(field)).as(field).isFalse();
        assertThat(output.get("smtpHost").asText()).isEqualTo("mail.example");
    }
}
