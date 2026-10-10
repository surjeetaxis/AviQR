package in.aviqr.paymentgateway.gateway.providers;

import com.paygate.ag.common.utils.PayGateCryptoUtils;
import in.aviqr.paymentgateway.gateway.*;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;

/** SafexPay / Avantgarde PayGate (legacy SafexPayManager): pipe-separated sections, each AES
 *  encrypted with the merchant key; the response sections decrypt only with the same key. */
@Component
public class SafexPayProvider implements GatewayProvider {
    public PaymentGateway gateway() { return PaymentGateway.SAFEXPAY; }
    public String label() { return "SafexPay"; }
    public Verification verification() { return Verification.SIGNED; }
    public List<CredentialField> credentialFields() {
        return List.of(CredentialField.text("merchantId", "Merchant ID"), CredentialField.secret("encryptionKey", "Merchant key"),
            CredentialField.optional("endpoint", "Payment URL", "https://www.avantgardepayments.com/agcore/payment",
                "Sandbox: https://sandbox.avantgardepayments.com:8082/agcore/payment"),
            CredentialField.optional("country", "Country", "India", null));
    }

    public Checkout begin(GatewayContext ctx) {
        Credentials c = ctx.credentials();
        String key = c.require("encryptionKey"), country = c.get("country", "India");
        String txn = String.join("|", "paygate", c.require("merchantId"), ctx.reference(), Long.toString(Money.minor(ctx.amount(), ctx.currency())),
            country, ctx.currency(), "SALE", ctx.callbackUrl(), ctx.callbackUrl(), "WAP");
        String customer = String.join("|", ctx.firstName(), ctx.email(), ctx.phoneDigits(), "", "N");
        String bill = "||" + "|" + country + "||";
        String ship = "||" + "|" + country + "||||";
        String url = UriComponentsBuilder.fromUriString(c.get("endpoint", "https://www.avantgardepayments.com/agcore/payment"))
            .queryParam("me_id", c.require("merchantId"))
            .queryParam("txn_details", enc(txn, key))
            .queryParam("pg_details", enc("||||", key))
            .queryParam("card_details", enc("|||||", key))
            .queryParam("cust_details", enc(customer, key))
            .queryParam("bill_details", enc(bill, key))
            .queryParam("ship_details", enc(ship, key))
            .queryParam("item_details", enc("|||", key))
            .queryParam("other_details", enc("|||||", key))
            .encode().build().toUriString();
        return Checkout.redirect(url);
    }

    public Outcome complete(GatewayContext ctx, Map<String, String> p) {
        String raw = p.get("txn_response");
        if (raw == null) return Outcome.failed("Payment was not completed");
        String plain = PayGateCryptoUtils.decrypt(raw, ctx.credentials().require("encryptionKey"));
        if (plain == null) return Outcome.unverified(null, "Response could not be decrypted");
        String[] t = plain.split("\\|", -1);
        if (t.length < 13 || !ctx.reference().equals(t[2])) return Outcome.failed("Unknown SafexPay transaction");
        // Amounts go to SafexPay in minor units, as the legacy service sent them.
        if (!"success".equalsIgnoreCase(t[10]) || !"0".equals(t[12])) return Outcome.failed("SafexPay status " + t[10] + " / " + t[12]);
        return Outcome.paid(null, null, Money.fromMinor(t[3], ctx.currency()));
    }

    private static String enc(String value, String key) { return PayGateCryptoUtils.encrypt(value, key); }
}
