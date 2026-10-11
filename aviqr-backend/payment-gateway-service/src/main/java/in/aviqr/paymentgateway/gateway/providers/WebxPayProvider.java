package in.aviqr.paymentgateway.gateway.providers;

import in.aviqr.paymentgateway.gateway.*;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Security;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.util.*;

/** WebXPay (legacy WebxPay): "ref|amount" RSA-OAEP encrypted with the merchant's public key.
 *  The legacy service skipped the response signature; here the signature is opened with the
 *  same public key and must match the payment data, or the result is left for staff. */
@Component
public class WebxPayProvider implements GatewayProvider {
    static { if (Security.getProvider("BC") == null) Security.addProvider(new org.bouncycastle.jce.provider.BouncyCastleProvider()); }

    public PaymentGateway gateway() { return PaymentGateway.WEBX_PAY; }
    public String label() { return "WebXPay"; }
    public Verification verification() { return Verification.SIGNED; }
    public List<CredentialField> credentialFields() {
        return List.of(CredentialField.secret("secretKey", "Secret key"), CredentialField.secret("publicKey", "Public key (base64)"),
            CredentialField.optional("endpoint", "Payment URL", "https://webxpay.com/index.php?route=checkout/billing", null));
    }

    public Checkout begin(GatewayContext ctx) throws Exception {
        Credentials c = ctx.credentials();
        Cipher rsa = Cipher.getInstance("RSA/None/OAEPWithSHA1AndMGF1Padding", "BC");
        rsa.init(Cipher.ENCRYPT_MODE, key(c.require("publicKey")));
        String payment = ctx.reference() + "|" + Money.major(ctx.amount(), ctx.currency());
        Map<String, String> f = new LinkedHashMap<>();
        f.put("first_name", ctx.firstName());
        f.put("last_name", ctx.lastName());
        f.put("email", ctx.email());
        f.put("contact_number", ctx.phoneDigits());
        f.put("address_line_one", "NA");
        f.put("secret_key", c.require("secretKey"));
        f.put("payment", Base64.getEncoder().encodeToString(rsa.doFinal(payment.getBytes(StandardCharsets.UTF_8))));
        f.put("cms", "JAVA");
        f.put("process_currency", ctx.currency());
        f.put("custom_fields", Base64.getEncoder().encodeToString(ctx.reference().getBytes(StandardCharsets.UTF_8)));
        f.put("return_url", ctx.callbackUrl());
        return Checkout.form(c.get("endpoint", "https://webxpay.com/index.php?route=checkout/billing"), f);
    }

    public Outcome complete(GatewayContext ctx, Map<String, String> p) {
        String payment = p.get("payment"), signature = p.get("signature");
        String plain = payment == null ? "" : new String(Base64.getMimeDecoder().decode(payment), StandardCharsets.UTF_8);
        // order_id|order_reference_number|date_time_transaction|status_code|comment|payment_gateway_used
        String[] parts = plain.split("\\|", -1);
        String orderId = parts.length > 0 && !parts[0].isBlank() ? parts[0] : p.get("order_id");
        String status = parts.length > 3 ? parts[3] : p.get("status_code");
        String pgRef = parts.length > 1 ? parts[1] : null;
        if (!ctx.reference().equals(orderId)) return Outcome.failed("Unknown WebXPay order");
        if (!("0".equals(status) || "00".equals(status))) return Outcome.failed(pgRef, parts.length > 4 ? parts[4] : "Declined");
        return Outcome.success(signed(ctx.credentials().require("publicKey"), plain, signature), pgRef, null, null);
    }

    /** WebXPay signs the payment text with its private key (PKCS#1 v1.5, no digest), so the
     *  signature is checked as exactly that: NONEwithRSA over the decoded payment text. */
    private static boolean signed(String publicKey, String plain, String signature) {
        try {
            if (plain.isEmpty() || signature == null) return false;
            Signature verifier = Signature.getInstance("NONEwithRSA");
            verifier.initVerify(key(publicKey));
            verifier.update(plain.getBytes(StandardCharsets.UTF_8));
            return verifier.verify(Base64.getMimeDecoder().decode(signature));
        } catch (Exception e) {
            return false;
        }
    }

    private static PublicKey key(String base64) throws Exception {
        String clean = base64.replaceAll("-----[A-Z ]+-----", "").replaceAll("\\s", "");
        return KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(Base64.getDecoder().decode(clean)));
    }

    public String referenceOf(Map<String, String> p) {
        try { return new String(Base64.getMimeDecoder().decode(p.get("payment")), StandardCharsets.UTF_8).split("\\|")[0]; }
        catch (Exception e) { return p.get("order_id"); }
    }
}
