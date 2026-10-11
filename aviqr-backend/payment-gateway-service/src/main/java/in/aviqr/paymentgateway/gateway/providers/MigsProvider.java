package in.aviqr.paymentgateway.gateway.providers;

import in.aviqr.paymentgateway.gateway.*;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;

/** Mastercard MIGS virtual payment client (legacy GlobalPayManager, gateway GLOBAL). The legacy
 *  service signed requests but never checked the response hash; this checks it. */
@Component
public class MigsProvider implements GatewayProvider {
    public PaymentGateway gateway() { return PaymentGateway.GLOBAL; }
    public String label() { return "MIGS (Mastercard)"; }
    public Verification verification() { return Verification.SIGNED; }
    public List<CredentialField> credentialFields() {
        return List.of(CredentialField.text("merchantId", "Merchant ID"), CredentialField.secret("accessCode", "Access code"),
            CredentialField.secret("hashSecret", "Secure hash secret (hex)"),
            CredentialField.optional("endpoint", "Payment URL", "https://migs.mastercard.com.au/vpcpay", null));
    }

    public Checkout begin(GatewayContext ctx) {
        Credentials c = ctx.credentials();
        Map<String, String> f = new TreeMap<>();
        f.put("vpc_Version", "1");
        f.put("vpc_Command", "pay");
        f.put("vpc_AccessCode", c.require("accessCode"));
        f.put("vpc_MerchTxnRef", ctx.reference());
        f.put("vpc_Merchant", c.require("merchantId"));
        f.put("vpc_OrderInfo", ctx.reference());
        f.put("vpc_Amount", Long.toString(Money.minor(ctx.amount(), ctx.currency())));
        f.put("vpc_Currency", ctx.currency());
        f.put("vpc_ReturnURL", ctx.callbackUrl());
        f.put("vpc_Locale", "en_US");
        f.put("vpc_SecureHash", hash(c.require("hashSecret"), f));
        f.put("vpc_SecureHashType", "SHA256");
        UriComponentsBuilder url = UriComponentsBuilder.fromUriString(c.get("endpoint", "https://migs.mastercard.com.au/vpcpay"));
        f.forEach(url::queryParam);
        return Checkout.redirect(url.encode().build().toUriString());
    }

    public Outcome complete(GatewayContext ctx, Map<String, String> p) {
        Map<String, String> signed = new TreeMap<>();
        p.forEach((k, v) -> { if ((k.startsWith("vpc_") || k.startsWith("user_")) && !k.equals("vpc_SecureHash") && !k.equals("vpc_SecureHashType")) signed.put(k, v); });
        boolean valid = Digests.same(hash(ctx.credentials().require("hashSecret"), signed), p.get("vpc_SecureHash"));
        if (!ctx.reference().equals(p.get("vpc_MerchTxnRef"))) return Outcome.failed("Unknown MIGS transaction");
        if (!"0".equals(p.get("vpc_TxnResponseCode"))) return Outcome.failed(p.get("vpc_TransactionNo"), Objects.toString(p.get("vpc_Message"), "Declined"));
        return Outcome.success(valid, p.get("vpc_TransactionNo"), p.get("vpc_ReceiptNo"), Money.fromMinor(p.get("vpc_Amount"), ctx.currency()));
    }

    /** HMAC-SHA256 over key=value pairs sorted by name, joined by '&', empty values skipped. */
    static String hash(String hexSecret, Map<String, String> fields) {
        StringJoiner buf = new StringJoiner("&");
        new TreeMap<>(fields).forEach((k, v) -> { if (v != null && !v.isEmpty()) buf.add(k + "=" + v); });
        return Digests.hmacSha256Hex(HexFormat.of().parseHex(hexSecret), buf.toString()).toUpperCase(Locale.ROOT);
    }
}
