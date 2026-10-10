package in.aviqr.paymentgateway.gateway.providers;

import in.aviqr.paymentgateway.gateway.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.util.*;

/** Commercial Bank of Ceylon on Mastercard Gateway hosted checkout (legacy CommercialBankManager).
 *  The legacy service kept the session's successIndicator in memory, so results were lost on
 *  restart and shared between hotels; it is kept with the transaction here. */
@Component @RequiredArgsConstructor
public class ComBankProvider implements GatewayProvider {
    private static final String DEFAULT_HOST = "https://cbcmpgs.gateway.mastercard.com";
    private final RestClient gatewayHttp;

    public PaymentGateway gateway() { return PaymentGateway.COMBANK; }
    public String label() { return "Commercial Bank (Mastercard Gateway)"; }
    public Verification verification() { return Verification.CONFIRMED_WITH_GATEWAY; }
    public List<CredentialField> credentialFields() {
        return List.of(CredentialField.text("merchantId", "Merchant ID"), CredentialField.text("apiUsername", "API username"),
            CredentialField.secret("apiPassword", "API password"), CredentialField.optional("merchantName", "Name shown at checkout", null, null),
            CredentialField.optional("host", "Gateway host", DEFAULT_HOST, null));
    }

    public Checkout begin(GatewayContext ctx) {
        Credentials c = ctx.credentials();
        var form = auth(c);
        form.add("apiOperation", "CREATE_CHECKOUT_SESSION");
        form.add("interaction.operation", "PURCHASE");
        form.add("interaction.returnUrl", ctx.callbackUrl());
        form.add("order.id", ctx.reference());
        form.add("order.amount", Money.major(ctx.amount(), ctx.currency()));
        form.add("order.currency", ctx.currency());
        Map<String, String> r = nvp(post(c, form));
        String session = r.get("session.id"), indicator = r.get("successIndicator");
        if (session == null || indicator == null) throw new GatewayException("Mastercard Gateway: " + r.getOrDefault("error.explanation", "no checkout session"));
        ctx.state().put("successIndicator", indicator);
        String host = c.get("host", DEFAULT_HOST);
        String script = "Checkout.configure({merchant:'" + Pages.js(c.require("merchantId")) + "',session:{id:'" + Pages.js(session) + "'},"
            + "order:{amount:'" + Pages.js(Money.major(ctx.amount(), ctx.currency())) + "',currency:'" + Pages.js(ctx.currency())
            + "',description:'" + Pages.js(ctx.description()) + "',id:'" + Pages.js(ctx.reference()) + "'},"
            + "interaction:{merchant:{name:'" + Pages.js(c.get("merchantName", "Hotel")) + "'}}});Checkout.showPaymentPage();";
        return Checkout.page(Pages.shell("Payment", "<script src=\"" + Pages.esc(host + "/checkout/version/52/checkout.js") + "\"></script>",
            "<div class=\"spin\"></div><p>Opening the secure payment page…</p><script>" + script + "</script>"));
    }

    public Outcome complete(GatewayContext ctx, Map<String, String> p) {
        String expected = ctx.state().get("successIndicator");
        if (expected == null || !Digests.exact(expected, p.get("resultIndicator"))) return Outcome.failed("Payment was not completed");
        Credentials c = ctx.credentials();
        var form = auth(c);
        form.add("apiOperation", "RETRIEVE_ORDER");
        form.add("order.id", ctx.reference());
        Map<String, String> r = nvp(post(c, form));
        if (!"SUCCESS".equals(r.get("result")) || !List.of("CAPTURED", "PURCHASED").contains(r.getOrDefault("status", "CAPTURED")))
            return Outcome.failed("Order status " + r.get("status"));
        return Outcome.paid(r.get("transaction[0].transaction.receipt"), r.get("transaction[0].transaction.acquirer.transactionId"),
            Money.parse(r.get("totalCapturedAmount") != null ? r.get("totalCapturedAmount") : r.get("amount")));
    }

    private LinkedMultiValueMap<String, String> auth(Credentials c) {
        var form = new LinkedMultiValueMap<String, String>();
        form.add("apiUsername", c.require("apiUsername"));
        form.add("apiPassword", c.require("apiPassword"));
        form.add("merchant", c.require("merchantId"));
        return form;
    }

    private String post(Credentials c, LinkedMultiValueMap<String, String> form) {
        return gatewayHttp.post().uri(c.get("host", DEFAULT_HOST) + "/api/nvp/version/52")
            .contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form).retrieve().body(String.class);
    }

    static Map<String, String> nvp(String body) {
        Map<String, String> out = new HashMap<>();
        for (String pair : Objects.toString(body, "").split("&")) {
            int i = pair.indexOf('=');
            if (i > 0) out.put(UriUtils.decode(pair.substring(0, i), StandardCharsets.UTF_8), UriUtils.decode(pair.substring(i + 1), StandardCharsets.UTF_8));
        }
        return out;
    }
}
