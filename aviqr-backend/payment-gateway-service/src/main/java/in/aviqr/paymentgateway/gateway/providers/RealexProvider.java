package in.aviqr.paymentgateway.gateway.providers;

import com.fasterxml.jackson.databind.JsonNode;
import in.aviqr.paymentgateway.gateway.*;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/** Global Payments UK (Realex HPP), legacy GlobalPayUKManager. Built on the HPP form protocol
 *  directly instead of the Global Payments SDK, signed with SHA-256 (SHA256HASH) rather than the
 *  legacy SHA-1: SHA-256 of SHA-256(fields)+"."+secret, and the response is signed the same way. */
@Component
public class RealexProvider implements GatewayProvider {
    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    public PaymentGateway gateway() { return PaymentGateway.GLOBALPAY_UK; }
    public String label() { return "Global Payments UK (Realex)"; }
    public Verification verification() { return Verification.SIGNED; }
    public List<CredentialField> credentialFields() {
        return List.of(CredentialField.text("merchantId", "Merchant ID"), CredentialField.optional("account", "Account", "internet", null),
            CredentialField.secret("sharedSecret", "Shared secret"));
    }

    public Checkout begin(GatewayContext ctx) {
        Credentials c = ctx.credentials();
        String ts = LocalDateTime.now().format(TS), amount = Long.toString(Money.minor(ctx.amount(), ctx.currency()));
        Map<String, String> f = new LinkedHashMap<>();
        f.put("TIMESTAMP", ts);
        f.put("MERCHANT_ID", c.require("merchantId"));
        f.put("ACCOUNT", c.get("account", "internet"));
        f.put("ORDER_ID", ctx.reference());
        f.put("AMOUNT", amount);
        f.put("CURRENCY", ctx.currency());
        f.put("AUTO_SETTLE_FLAG", "1");
        f.put("HPP_VERSION", "2");
        f.put("HPP_CHANNEL", "ECOM");
        f.put("HPP_LANG", "en");
        if (!ctx.email().isBlank()) f.put("HPP_CUSTOMER_EMAIL", ctx.email());
        f.put("MERCHANT_RESPONSE_URL", ctx.callbackUrl());
        f.put("SHA256HASH", sign(c.require("sharedSecret"), ts, c.require("merchantId"), ctx.reference(), amount, ctx.currency()));
        return Checkout.form(ctx.testMode() ? "https://pay.sandbox.realexpayments.com/pay" : "https://hpp.realexpayments.com/pay", f);
    }

    public Outcome complete(GatewayContext ctx, Map<String, String> raw) {
        Map<String, String> p = raw;
        if (raw.containsKey("hppResponse")) { // the JS lightbox posts one base64-encoded JSON field
            p = new HashMap<>();
            JsonNode n = Json.parse(raw.get("hppResponse"));
            for (var it = n.fields(); it.hasNext(); ) {
                var e = it.next();
                p.put(e.getKey(), new String(Base64.getDecoder().decode(e.getValue().asText()), StandardCharsets.UTF_8));
            }
        }
        if (!ctx.reference().equals(p.get("ORDER_ID"))) return Outcome.failed("Unknown Global Payments order");
        String expected = sign(ctx.credentials().require("sharedSecret"), v(p, "TIMESTAMP"), v(p, "MERCHANT_ID"), v(p, "ORDER_ID"),
            v(p, "RESULT"), v(p, "MESSAGE"), v(p, "PASREF"), v(p, "AUTHCODE"));
        boolean valid = Digests.same(expected, p.get("SHA256HASH"));
        if (!"00".equals(p.get("RESULT"))) return Outcome.failed(p.get("PASREF"), v(p, "MESSAGE"));
        return Outcome.success(valid, p.get("PASREF"), p.get("AUTHCODE"), Money.fromMinor(p.get("AMOUNT"), ctx.currency()));
    }

    static String sign(String secret, String... parts) {
        return Digests.sha256Hex(Digests.sha256Hex(String.join(".", parts)) + "." + secret);
    }

    private static String v(Map<String, String> p, String k) { return Objects.toString(p.get(k), ""); }
}
