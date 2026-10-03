package in.aviqr.shop.security;

import in.aviqr.shop.repository.ShopSettingsRepository;
import java.util.UUID;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/** Explicit one-time migration: never logs credentials and locks rows while re-saving. */
@Component
@ConditionalOnProperty(name = "app.credentials.backfill", havingValue = "true")
public class CredentialEncryptionBackfill implements ApplicationRunner {
    private final JdbcTemplate jdbc;
    private final ShopSettingsRepository repo;
    private final TransactionTemplate transaction;
    public CredentialEncryptionBackfill(JdbcTemplate jdbc, ShopSettingsRepository repo, org.springframework.transaction.PlatformTransactionManager manager) {
        this.jdbc=jdbc; this.repo=repo; this.transaction=new TransactionTemplate(manager);
    }
    @Override public void run(ApplicationArguments args) {
        while (Boolean.TRUE.equals(transaction.execute(status -> {
            var ids=jdbc.query("""
                SELECT shop_id FROM shop_settings WHERE
                (razorpay_key_secret IS NOT NULL AND btrim(razorpay_key_secret) <> '' AND razorpay_key_secret NOT LIKE 'enc:v1:%') OR
                (razorpay_webhook_secret IS NOT NULL AND btrim(razorpay_webhook_secret) <> '' AND razorpay_webhook_secret NOT LIKE 'enc:v1:%') OR
                (smtp_password IS NOT NULL AND btrim(smtp_password) <> '' AND smtp_password NOT LIKE 'enc:v1:%') OR
                (twilio_token IS NOT NULL AND btrim(twilio_token) <> '' AND twilio_token NOT LIKE 'enc:v1:%') OR
                (whatsapp_api_key IS NOT NULL AND btrim(whatsapp_api_key) <> '' AND whatsapp_api_key NOT LIKE 'enc:v1:%') OR
                (fcm_server_key IS NOT NULL AND btrim(fcm_server_key) <> '' AND fcm_server_key NOT LIKE 'enc:v1:%')
                LIMIT 100 FOR UPDATE
                """, (rs,row) -> rs.getObject(1,UUID.class));
            if (ids.isEmpty()) return false;
            // Explicit SQL update avoids Hibernate's dirty checking skipping unchanged plaintext.
            var converter=new RazorpaySecretConverter();
            for (var settings:repo.findAllById(ids)) {
                jdbc.update("UPDATE shop_settings SET razorpay_key_secret=?,razorpay_webhook_secret=?,smtp_password=?,twilio_token=?,whatsapp_api_key=?,fcm_server_key=? WHERE shop_id=?",
                    converter.convertToDatabaseColumn(settings.getRazorpayKeySecret()),converter.convertToDatabaseColumn(settings.getRazorpayWebhookSecret()),
                    converter.convertToDatabaseColumn(settings.getSmtpPassword()),converter.convertToDatabaseColumn(settings.getTwilioToken()),
                    converter.convertToDatabaseColumn(settings.getWhatsappApiKey()),converter.convertToDatabaseColumn(settings.getFcmServerKey()),settings.getShopId());
            }
            return true;
        }))) { /* batches commit independently */ }
    }
}
