package in.aviqr.paymentgateway.gateway.providers;

import com.fasterxml.jackson.databind.JsonNode;
import in.aviqr.paymentgateway.gateway.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.*;

/** Razorpay Payment Links: a hosted page, and a callback signed with the key secret. */
@Component @RequiredArgsConstructor
public class RazorpayProvider implements GatewayProvider {
    private static final String API = "https://api.razorpay.com/v1/payment_links";
    private final RestClient gatewayHttp;

    public PaymentGateway gateway() { return PaymentGateway.RAZORPAY; }
    public String label() { return "Razorpay"; }
    public Verification verification() { return Verification.SIGNED; }
    public List<CredentialField> credentialFields() {
        return List.of(CredentialField.text("keyId", "Key ID"), CredentialField.secret("keySecret", "Key secret"));
    }

    public Checkout begin(GatewayContext ctx) {
        Map<String, Object> customer = new LinkedHashMap<>();
        if (ctx.guestName() != null) customer.put("name", ctx.guestName());
        if (ctx.guestEmail() != null) customer.put("email", ctx.guestEmail());
        if (ctx.guestPhone() != null) customer.put("contact", ctx.guestPhone());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("amount", Money.minor(ctx.amount(), ctx.currency()));
        body.put("currency", ctx.currency());
        body.put("reference_id", ctx.reference());
        body.put("description", ctx.description());
        body.put("customer", customer);
        body.put("notify", Map.of("sms", false, "email", false));
        body.put("callback_url", ctx.callbackUrl());
        body.put("callback_method", "get");
        JsonNode link = Json.parse(gatewayHttp.post().uri(API).header("Authorization", auth(ctx))
            .contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(String.class));
        String id = Json.text(link, "id"), url = Json.text(link, "short_url");
        if (id == null || url == null) throw new GatewayException("Razorpay did not return a payment link");
        ctx.state().put("linkId", id);
        return Checkout.redirect(url);
    }

    public Outcome complete(GatewayContext ctx, Map<String, String> p) {
        String paymentId = p.get("razorpay_payment_id"), linkId = p.get("razorpay_payment_link_id");
        String ref = p.get("razorpay_payment_link_reference_id"), status = p.get("razorpay_payment_link_status");
        if (paymentId == null || linkId == null) return Outcome.failed("Payment was not completed");
        String expected = Digests.hmacSha256Hex(ctx.credentials().require("keySecret"), linkId + "|" + ref + "|" + status + "|" + paymentId);
        boolean valid = Digests.same(expected, p.get("razorpay_signature")) && linkId.equals(ctx.state().get("linkId"))
            && ctx.reference().equals(ref);
        if (!valid) return Outcome.unverified(paymentId, "Signature missing or invalid");
        return "paid".equals(status) ? Outcome.paid(paymentId, null, ctx.amount()) : Outcome.failed(paymentId, "Razorpay status " + status);
    }

    private static String auth(GatewayContext ctx) {
        String pair = ctx.credentials().require("keyId") + ":" + ctx.credentials().require("keySecret");
        return "Basic " + Base64.getEncoder().encodeToString(pair.getBytes(StandardCharsets.UTF_8));
    }
}
