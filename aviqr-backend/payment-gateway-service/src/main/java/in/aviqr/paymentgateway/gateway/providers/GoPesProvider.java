package in.aviqr.paymentgateway.gateway.providers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import in.aviqr.paymentgateway.gateway.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.*;

/** Goomo PES (legacy GoPesManager): init-payment for a PES token, then on return the transaction
 *  is confirmed with txn-details and captured, both server-side. */
@Component @RequiredArgsConstructor
public class GoPesProvider implements GatewayProvider {
    private static final String API = "https://gopes.goomo.com/ext/ar/v2.0/";
    private final RestClient gatewayHttp;

    public PaymentGateway gateway() { return PaymentGateway.GOPES; }
    public String label() { return "GoPES (Goomo)"; }
    public Verification verification() { return Verification.CONFIRMED_WITH_GATEWAY; }
    public List<CredentialField> credentialFields() {
        return List.of(CredentialField.secret("authorization", "API authorization (Basic …)"), CredentialField.secret("apiKey", "API key"),
            CredentialField.secret("aesKey", "AES key"), CredentialField.text("merchantKey", "Merchant key"),
            CredentialField.secret("merchantPassword", "Merchant password"), CredentialField.optional("paymentGateway", "Underlying gateway", "PAYU", "PAYU or RZP"),
            CredentialField.optional("formUrl", "Payment page URL", "https://payment.axisrooms.com/payment/", "The domain Goomo mapped for you"));
    }

    public Checkout begin(GatewayContext ctx) throws Exception {
        Credentials c = ctx.credentials();
        String aes = c.require("aesKey"), amount = Long.toString(Money.minor(ctx.amount(), ctx.currency()));
        ObjectNode m = Json.MAPPER.createObjectNode();
        m.put("channel", "B2C").put("platform", "DESKTOP").put("product", "Hotels").put("createdBy", ctx.email())
            .put("referenceId", ctx.reference()).put("orderId", ctx.reference()).put("transactionExpirationTime", "1800")
            .put("callbackUrl", ctx.callbackUrl()).put("timeoutUrl", ctx.callbackUrl()).put("paymentGatewayMode", "NATIVE");
        m.put("tenacyInfo", Json.MAPPER.writeValueAsString(Map.of("orgId", "AviQR", "orgName", "AviQR", "orgUnit", "", "orgUnitName", "",
            "tenantId", ctx.hotelId().toString(), "tenantName", "AviQR")));
        m.put("merchandisingInfo", Json.MAPPER.writeValueAsString(Map.of("content", "", "placement", "", "uiCardType", "")));
        Map<String, Object> merchant = new LinkedHashMap<>();
        merchant.put("key", encrypt(c.require("merchantKey"), aes));
        merchant.put("pswd", encrypt(c.require("merchantPassword"), aes));
        Map<String, Object> payment = new LinkedHashMap<>();
        payment.put("orderId", ctx.reference());
        payment.put("currency", ctx.currency());
        payment.put("merchantId", ctx.transactionId().toString());
        payment.put("totalPayableAmount", amount);
        payment.put("promoApplied", "");
        payment.put("promoCode", "");
        payment.put("paymentGateway", c.get("paymentGateway", "PAYU"));
        payment.put("merchantInfo", merchant);
        payment.put("allowedPaymentInstruments", "CARD,NETBANKING,UPI,GIFTCARD");
        m.put("paymentInfo", Json.MAPPER.writeValueAsString(payment));
        Map<String, Object> user = new LinkedHashMap<>();
        user.put("authToken", ""); user.put("emailId", ctx.email()); user.put("id", ""); user.put("mobileNumber", ctx.phoneDigits());
        user.put("name", ctx.firstName()); user.put("terminalId", ""); user.put("type", "User"); user.put("userLoggedIn", false);
        user.put("wallet", Map.of("usableTransactionAmount", "", "walletPrincipalAmount", "", "walletProvider", "", "walletToken", ""));
        m.put("userInfo", Json.MAPPER.writeValueAsString(user));
        Map<String, Object> product = new LinkedHashMap<>();
        product.put("policyDetail", "{}");
        product.put("pricingDetail", List.of(Map.of("idx", "1", "label", "Base", "price", amount, "subLabels", List.of()),
            Map.of("idx", "5", "label", "Total", "price", amount)));
        product.put("productDesc", "<div style='font-size: 18px;'>" + Pages.esc(ctx.description()) + "</div>");
        product.put("travellerDetail", List.of(Map.of("email", ctx.email(), "firstName", ctx.firstName(), "lastName", ctx.lastName(), "phone", "", "title", "")));
        product.put("productDetail", Map.of("alertSessionTimeLimit", "3000000", "checkoutStartTime", Long.toString(System.currentTimeMillis()),
            "checkoutTimerDuration", "90000000000"));
        m.put("productInfo", Json.MAPPER.writeValueAsString(product));
        String body = post(c, "init-payment", m.toString());
        if (!body.contains("SUCCESS")) throw new GatewayException("GoPES init failed");
        String token = Json.text(Json.parse(body), "pesToken");
        if (token == null) throw new GatewayException("GoPES did not return a token");
        return Checkout.redirect(c.get("formUrl", "https://payment.axisrooms.com/payment/") + token);
    }

    public Outcome complete(GatewayContext ctx, Map<String, String> p) {
        JsonNode cb = null;
        for (String v : p.values()) {
            JsonNode n = Json.parse(v);
            if ("200".equals(n.path("status").asText())) { cb = n; break; }
        }
        if (cb == null) return Outcome.failed("Payment was not completed");
        if (!ctx.reference().equals(cb.path("referenceId").asText())) return Outcome.failed("Unknown GoPES payment");
        if (!"SUCCESS".equalsIgnoreCase(Json.parse(cb.path("statusMessage").asText()).path("code").asText(cb.path("statusMessage").path("code").asText())))
            return Outcome.failed("GoPES status not successful");
        String txnId = cb.path("payments") instanceof ArrayNode a && !a.isEmpty() ? a.get(0).path("txnId").asText(null) : null;
        Credentials c = ctx.credentials();
        ObjectNode confirm = Json.MAPPER.createObjectNode().put("referenceId", ctx.reference())
            .put("totalAmount", cb.path("totalPrice").asText()).put("totalPayableAmount", cb.path("totalPaybleAmount").asText())
            .put("requestType", "confirm").put("totalGSTAmount", "").put("totalPaymentCharges", "");
        if (!ok(post(c, "txn-details", confirm.toString()))) return Outcome.failed(txnId, "GoPES did not confirm the transaction");
        if (!ok(post(c, "capture-callback", Json.MAPPER.createObjectNode().put("referenceId", ctx.reference()).toString())))
            return Outcome.failed(txnId, "GoPES capture failed");
        return Outcome.paid(txnId, null, Money.fromMinor(cb.path("totalPaybleAmount").asText(null), ctx.currency()));
    }

    private static boolean ok(String body) {
        JsonNode n = Json.parse(body);
        return "200".equals(n.path("status").asText()) && "SUCCESS".equalsIgnoreCase(n.path("statusMessage").path("code").asText());
    }

    private String post(Credentials c, String op, String json) {
        return Objects.toString(gatewayHttp.post().uri(API + op).contentType(MediaType.APPLICATION_JSON)
            .header("Authorization", c.require("authorization")).header("apikey", c.require("apiKey"))
            .body(json).retrieve().body(String.class), "");
    }

    /** The legacy GopesSecurityConfiguration scheme: PBKDF2 (salt 20 bytes, 65536 rounds) AES-CBC, salt+IV+ciphertext in base64. */
    static String encrypt(String word, String aesKey) throws Exception {
        byte[] salt = new byte[20];
        new SecureRandom().nextBytes(salt);
        SecretKeyFactory factory = SecretKeyFactory.getInstance("PBEWithHmacSHA256AndAES_128");
        byte[] key = factory.generateSecret(new PBEKeySpec(aesKey.toCharArray(), salt, 65536, 256)).getEncoded();
        Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
        cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"));
        byte[] iv = cipher.getParameters().getParameterSpec(IvParameterSpec.class).getIV();
        byte[] enc = cipher.doFinal(word.getBytes(StandardCharsets.UTF_8));
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        out.write(salt);
        out.write(iv);
        out.write(enc);
        return Base64.getEncoder().encodeToString(out.toByteArray());
    }
}
