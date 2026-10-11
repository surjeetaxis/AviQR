package in.aviqr.paymentgateway.gateway.providers;

import in.aviqr.paymentgateway.gateway.*;
import org.springframework.stereotype.Component;

import java.util.*;

/** AggrePay (legacy AggrePayManager): SHA-512 over the salt and the sorted values, both ways. */
@Component
public class AggrePayProvider implements GatewayProvider {
    public PaymentGateway gateway() { return PaymentGateway.AGGREPAY; }
    public String label() { return "AggrePay"; }
    public Verification verification() { return Verification.SIGNED; }
    public List<CredentialField> credentialFields() {
        return List.of(CredentialField.text("apiKey", "API key"), CredentialField.secret("salt", "Salt"),
            CredentialField.optional("endpoint", "Payment URL", "https://biz.aggrepaypayments.com/v2/paymentrequest", null),
            CredentialField.optional("city", "City", "Bangalore", null), CredentialField.optional("country", "Country", "India", null),
            CredentialField.optional("zipCode", "Postal code", "560070", null));
    }

    public Checkout begin(GatewayContext ctx) {
        Credentials c = ctx.credentials();
        Map<String, String> f = new HashMap<>();
        f.put("api_key", c.require("apiKey"));
        f.put("order_id", ctx.reference());
        f.put("amount", Money.major(ctx.amount(), ctx.currency()));
        f.put("currency", ctx.currency());
        f.put("description", ctx.description());
        f.put("name", ctx.guestName() == null ? "Guest" : ctx.guestName());
        f.put("email", ctx.email());
        f.put("phone", ctx.phoneDigits());
        f.put("city", c.get("city", "Bangalore"));
        f.put("country", c.get("country", "India"));
        f.put("zip_code", c.get("zipCode", "560070"));
        f.put("udf1", ctx.hotelId().toString());
        f.put("return_url", ctx.callbackUrl());
        f.put("hash", hash(c.require("salt"), f));
        return Checkout.form(c.get("endpoint", "https://biz.aggrepaypayments.com/v2/paymentrequest"), f);
    }

    public Outcome complete(GatewayContext ctx, Map<String, String> p) {
        if (!ctx.reference().equals(p.get("order_id"))) return Outcome.failed("Unknown AggrePay order");
        Map<String, String> signed = new HashMap<>(p);
        signed.remove("hash");
        boolean valid = Digests.same(hash(ctx.credentials().require("salt"), signed), p.get("hash"));
        if (!"0".equals(Objects.toString(p.get("response_code"), "").trim()))
            return Outcome.failed(p.get("transaction_id"), Objects.toString(p.get("response_message"), "Payment failed"));
        return Outcome.success(valid, p.get("transaction_id"), null, Money.parse(p.get("amount")));
    }

    /** Exactly the legacy shaHashAllFields: SALT|v1|v2… over sorted keys, empty values skipped. */
    static String hash(String salt, Map<String, String> fields) {
        List<String> names = new ArrayList<>(fields.keySet());
        Collections.sort(names);
        StringBuilder buf = new StringBuilder(salt + "|");
        for (Iterator<String> it = names.iterator(); it.hasNext(); ) {
            String v = fields.get(it.next());
            if (v != null && !v.isEmpty()) {
                buf.append(v);
                if (it.hasNext()) buf.append('|');
            }
        }
        return Digests.sha512Hex(buf.toString()).toUpperCase(Locale.ROOT);
    }
}
