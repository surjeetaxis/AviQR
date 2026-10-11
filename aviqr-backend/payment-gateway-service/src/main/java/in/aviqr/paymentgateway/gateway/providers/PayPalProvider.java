package in.aviqr.paymentgateway.gateway.providers;

import com.fasterxml.jackson.databind.JsonNode;
import in.aviqr.paymentgateway.gateway.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.nio.charset.StandardCharsets;
import java.util.*;

/** PayPal Orders v2: approve on PayPal, then the order is captured server-side. Ported from the
 *  legacy PayPalManager, which proxied the same token/order/capture calls for the caller. */
@Component @RequiredArgsConstructor
public class PayPalProvider implements GatewayProvider {
    private final RestClient gatewayHttp;
    @Value("${payment-gateway.paypal.partner-attribution-id:}") private String partnerId;

    public PaymentGateway gateway() { return PaymentGateway.PAYPAL; }
    public String label() { return "PayPal"; }
    public Verification verification() { return Verification.CONFIRMED_WITH_GATEWAY; }
    public List<CredentialField> credentialFields() {
        return List.of(CredentialField.text("clientId", "Client ID"), CredentialField.secret("clientSecret", "Client secret"));
    }

    public Checkout begin(GatewayContext ctx) {
        Map<String, Object> unit = new LinkedHashMap<>();
        unit.put("reference_id", ctx.reference());
        unit.put("invoice_id", ctx.reference());
        unit.put("description", ctx.description());
        unit.put("amount", Map.of("currency_code", ctx.currency(), "value", Money.major(ctx.amount(), ctx.currency())));
        Map<String, Object> body = Map.of("intent", "CAPTURE", "purchase_units", List.of(unit),
            "application_context", Map.of("return_url", ctx.callbackUrl(), "cancel_url", ctx.callbackUrl() + "?cancelled=1",
                "user_action", "PAY_NOW", "shipping_preference", "NO_SHIPPING"));
        JsonNode order = Json.parse(call(ctx).post().uri(base(ctx) + "/v2/checkout/orders").contentType(MediaType.APPLICATION_JSON)
            .header("PayPal-Request-Id", ctx.reference()).body(body).retrieve().body(String.class));
        ctx.state().put("orderId", Json.text(order, "id"));
        for (JsonNode link : order.path("links"))
            if ("approve".equals(link.path("rel").asText()) || "payer-action".equals(link.path("rel").asText())) return Checkout.redirect(link.path("href").asText());
        throw new GatewayException("PayPal did not return an approval link");
    }

    public Outcome complete(GatewayContext ctx, Map<String, String> p) {
        if (p.containsKey("cancelled")) return Outcome.failed("Cancelled on PayPal");
        String orderId = ctx.state().get("orderId");
        if (orderId == null || !orderId.equals(p.get("token"))) return Outcome.failed("Unknown PayPal order");
        JsonNode result;
        try {
            result = Json.parse(call(ctx).post().uri(base(ctx) + "/v2/checkout/orders/" + orderId + "/capture")
                .contentType(MediaType.APPLICATION_JSON).header("PayPal-Request-Id", ctx.reference() + "-capture").body("{}").retrieve().body(String.class));
        } catch (RestClientResponseException e) {
            // Already captured (a repeated return): read the order instead.
            result = Json.parse(call(ctx).get().uri(base(ctx) + "/v2/checkout/orders/" + orderId).retrieve().body(String.class));
        }
        JsonNode capture = result.path("purchase_units").path(0).path("payments").path("captures").path(0);
        String status = capture.path("status").asText(result.path("status").asText());
        if (!"COMPLETED".equals(status)) return "PENDING".equals(status) ? Outcome.pending("PayPal capture pending") : Outcome.failed(orderId, "PayPal status " + status);
        if (!ctx.currency().equals(capture.path("amount").path("currency_code").asText())) return Outcome.unverified(orderId, "Currency mismatch");
        return Outcome.paid(capture.path("id").asText(orderId), orderId, Money.parse(capture.path("amount").path("value").asText()));
    }

    private String base(GatewayContext ctx) { return ctx.testMode() ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com"; }

    private RestClient call(GatewayContext ctx) {
        String pair = ctx.credentials().require("clientId") + ":" + ctx.credentials().require("clientSecret");
        JsonNode token = Json.parse(gatewayHttp.post().uri(base(ctx) + "/v1/oauth2/token")
            .header("Authorization", "Basic " + Base64.getEncoder().encodeToString(pair.getBytes(StandardCharsets.UTF_8)))
            .contentType(MediaType.APPLICATION_FORM_URLENCODED).body("grant_type=client_credentials").retrieve().body(String.class));
        String access = Json.text(token, "access_token");
        if (access == null) throw new GatewayException("PayPal rejected the client ID or secret");
        return gatewayHttp.mutate().defaultHeaders(h -> {
            h.setBearerAuth(access);
            if (partnerId != null && !partnerId.isBlank()) h.set("PayPal-Partner-Attribution-Id", partnerId);
        }).build();
    }
}
