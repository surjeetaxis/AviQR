package in.aviqr.paymentgateway.gateway.providers;

import in.aviqr.paymentgateway.gateway.*;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.*;

/** AirPay (legacy AirPayManager): an MD5 checksum on the form, a CRC32 hash on the result.
 *  The legacy service kept every hotel's AirPay keys in code; here each hotel enters its own. */
@Component
public class AirPayProvider implements GatewayProvider {
    public PaymentGateway gateway() { return PaymentGateway.AIRPAY; }
    public String label() { return "AirPay"; }
    public Verification verification() { return Verification.SIGNED; }
    public List<CredentialField> credentialFields() {
        return List.of(CredentialField.text("merchantId", "Merchant ID"), CredentialField.text("username", "Username"),
            CredentialField.secret("password", "Password"), CredentialField.secret("apiKey", "API key"),
            CredentialField.optional("endpoint", "Payment URL", "https://payments.airpay.co.in/pay/index.php", null));
    }

    public Checkout begin(GatewayContext ctx) {
        Credentials c = ctx.credentials();
        String amount = Money.major(ctx.amount(), ctx.currency());
        String privateKey = Digests.sha256Hex(c.require("apiKey") + "@" + c.require("username") + ":|:" + c.require("password"));
        String checksum = checksum(ctx.email() + ctx.firstName() + ctx.lastName() + amount + ctx.reference() + LocalDate.now(java.time.ZoneId.of("Asia/Kolkata")) + privateKey);
        Map<String, String> f = new LinkedHashMap<>();
        f.put("currency", Money.numeric(ctx.currency()));
        f.put("isocurrency", ctx.currency());
        f.put("orderid", ctx.reference());
        f.put("privatekey", privateKey);
        f.put("checksum", checksum);
        f.put("mercid", c.require("merchantId"));
        f.put("buyerEmail", ctx.email());
        f.put("buyerPhone", ctx.phoneDigits());
        f.put("buyerFirstName", ctx.firstName());
        f.put("buyerLastName", ctx.lastName());
        f.put("amount", amount);
        f.put("chmod", "");
        f.put("ReturnURL", ctx.callbackUrl());
        f.put("customvar", ctx.reference());
        return Checkout.form(c.get("endpoint", "https://payments.airpay.co.in/pay/index.php"), f);
    }

    public Outcome complete(GatewayContext ctx, Map<String, String> p) {
        String txn = p.getOrDefault("TRANSACTIONID", ""), apTxn = p.getOrDefault("APTRANSACTIONID", ""), amount = p.getOrDefault("AMOUNT", "");
        String status = p.getOrDefault("TRANSACTIONSTATUS", ""), message = p.getOrDefault("MESSAGE", "");
        if (!ctx.reference().equals(txn)) return Outcome.failed("Unknown AirPay transaction");
        String expected = Digests.crc32(txn + ":" + apTxn + ":" + amount + ":" + status + ":" + message + ":"
            + ctx.credentials().require("merchantId") + ":" + ctx.credentials().require("username"));
        boolean valid = Digests.same(expected, p.get("ap_SecureHash"));
        if (!"200".equals(status)) return Outcome.failed(apTxn, message.isBlank() ? "AirPay status " + status : message);
        return Outcome.success(valid, apTxn, null, Money.parse(amount));
    }

    public String referenceOf(Map<String, String> p) { return p.get("TRANSACTIONID"); }

    /** AirPay's form checksum is hex MD5, as its API defines it; AirPay accepts no other algorithm.
     *  Accepted in .github/security/sast-exceptions.json. */
    static String checksum(String data) {
        try {
            return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("MD5")
                .digest(data.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
