package in.aviqr.payment.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Refuses to start under the "production" profile if Razorpay keys are still
 * the dev placeholders. Without this, PaymentController's placeholder checks
 * silently degrade to mock order IDs and skip webhook signature verification
 * — safe in dev, a broken/insecure payment flow if it ever happens in prod.
 */
@Component
@Profile("production")
public class RazorpayProductionGuard {

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpaySecret;

    @Value("${razorpay.webhook.secret}")
    private String razorpayWebhookSecret;

    @PostConstruct
    public void verifyNoPlaceholders() {
        if (razorpayKeyId.startsWith("rzp_test_placeholder")
                || razorpaySecret.equals("placeholder_secret")
                || razorpaySecret.equals("rzp_test_placeholder_secret")
                || razorpayWebhookSecret.equals("placeholder_secret")) {
            throw new IllegalStateException(
                "Refusing to start payment-service under the 'production' profile with placeholder " +
                "Razorpay credentials. Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET.");
        }
    }
}
