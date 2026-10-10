package in.aviqr.paymentgateway.gateway.providers;

import in.aviqr.paymentgateway.gateway.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** AccomClick on MobiVersa's hotel API (legacy AccomClickManager): MobiVersa sends the guest a
 *  pre-authorisation payment link. The callback is unsigned, so success is recorded UNVERIFIED. */
@Component @RequiredArgsConstructor
public class AccomClickProvider implements GatewayProvider {
    private final RestClient gatewayHttp;

    public PaymentGateway gateway() { return PaymentGateway.ACCOMCLICK; }
    public String label() { return "AccomClick (MobiVersa payment link)"; }
    public Verification verification() { return Verification.UNVERIFIED; }
    public List<CredentialField> credentialFields() {
        return List.of(CredentialField.text("loginId", "Login ID"), CredentialField.secret("mobiApiKey", "MobiVersa API key"));
    }

    public Checkout begin(GatewayContext ctx) throws Exception {
        String apiKey = ctx.credentials().require("mobiApiKey");
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("invoiceId", ctx.reference());
        body.put("mobileNo", ctx.phoneDigits());
        body.put("email", ctx.email());
        body.put("customerName", Objects.toString(ctx.guestName(), "Guest"));
        body.put("service", "TXN_LINK_REQ");
        body.put("encAmount", encAmount(apiKey, Money.minor(ctx.amount(), ctx.currency())));
        body.put("motoPreAuth", "YES");
        body.put("callback", ctx.callbackUrl());
        gatewayHttp.post().uri(ctx.testMode() ? "https://test.mobiversa.com/payment/mobihotelapi/jsonservice" : "https://pay.mobiversa.com/payment/mobihotelapi/jsonservice")
            .contentType(MediaType.APPLICATION_JSON).header("loginId", ctx.credentials().require("loginId")).header("mobiApiKey", apiKey)
            .body(body).retrieve().toBodilessEntity();
        return Checkout.page(Pages.message("Payment link sent", "We've sent a secure payment link to your phone and email. Your booking is confirmed once the hotel receives the payment."));
    }

    public Outcome complete(GatewayContext ctx, Map<String, String> p) {
        if (!ctx.reference().equals(p.get("invoiceId"))) return Outcome.failed("Unknown AccomClick invoice");
        if (!"0000".equals(p.get("responseCode"))) return Outcome.failed(Objects.toString(p.get("responseMessage"), "Declined"));
        return Outcome.unverified(p.get("trxId"), "AccomClick results are unsigned; confirm in the MobiVersa portal");
    }

    public String referenceOf(Map<String, String> p) { return p.get("invoiceId"); }

    /** Exactly the legacy scheme: 12-digit minor amount, AES-CBC with the key's halves as key and IV, base64, then hex. */
    static String encAmount(String apiKey, long minor) throws Exception {
        String key = apiKey.substring(0, apiKey.length() / 2), iv = apiKey.substring(apiKey.length() / 2);
        Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5PADDING");
        cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "AES"), new IvParameterSpec(iv.getBytes(StandardCharsets.UTF_8)));
        String b64 = Base64.getEncoder().encodeToString(cipher.doFinal(String.format("%012d", minor).getBytes(StandardCharsets.UTF_8)));
        return HexFormat.of().withUpperCase().formatHex(b64.getBytes(StandardCharsets.UTF_8));
    }
}
