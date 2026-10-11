package in.aviqr.paymentgateway.gateway.providers;

import com.fasterxml.jackson.databind.JsonNode;
import in.aviqr.paymentgateway.gateway.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;

import java.util.*;

/** PayTabs (legacy PayTabs manager, on PayTabs' apiv2 endpoints): a pay page created
 *  server-side, and the result read back with verify_payment. */
@Component @RequiredArgsConstructor
public class PayTabsProvider implements GatewayProvider {
    private static final String API = "https://www.paytabs.com/apiv2/";
    private final RestClient gatewayHttp;

    public PaymentGateway gateway() { return PaymentGateway.PAY_TABS; }
    public String label() { return "PayTabs"; }
    public Verification verification() { return Verification.CONFIRMED_WITH_GATEWAY; }
    public List<CredentialField> credentialFields() {
        return List.of(CredentialField.text("merchantEmail", "Merchant email"), CredentialField.secret("secretKey", "Secret key"),
            CredentialField.optional("siteUrl", "Registered site URL", "https://www.aviqr.com/", null),
            CredentialField.optional("phoneCountryCode", "Phone country code", "091", null));
    }

    public Checkout begin(GatewayContext ctx) {
        Credentials c = ctx.credentials();
        String amount = Money.major(ctx.amount(), ctx.currency());
        var f = base(c);
        f.add("site_url", c.get("siteUrl", "https://www.aviqr.com/"));
        f.add("return_url", ctx.callbackUrl());
        f.add("title", ctx.reference());
        f.add("cc_first_name", ctx.firstName());
        f.add("cc_last_name", ctx.lastName());
        f.add("cc_phone_number", c.get("phoneCountryCode", "091"));
        f.add("phone_number", ctx.phoneDigits());
        f.add("email", ctx.email());
        f.add("products_per_title", ctx.description());
        f.add("unit_price", amount);
        f.add("quantity", "1");
        f.add("other_charges", "0");
        f.add("amount", amount);
        f.add("discount", "0");
        f.add("currency", ctx.currency());
        f.add("reference_no", ctx.reference());
        f.add("ip_customer", "127.0.0.1");
        f.add("ip_merchant", "127.0.0.1");
        for (String k : List.of("billing_address", "address_shipping")) f.add(k, "NA");
        for (String k : List.of("state", "city", "state_shipping", "city_shipping")) f.add(k, "NA");
        for (String k : List.of("postal_code", "postal_code_shipping")) f.add(k, "000000");
        f.add("country", "IND");
        f.add("country_shipping", "IND");
        f.add("shipping_first_name", ctx.firstName());
        f.add("shipping_last_name", ctx.lastName());
        f.add("msg_lang", "English");
        f.add("cms_with_version", "AviQR");
        JsonNode r = post("create_pay_page", f);
        if (!"4012".equals(r.path("response_code").asText()) || r.path("payment_url").isMissingNode())
            throw new GatewayException("PayTabs: " + r.path("result").asText("could not create the pay page"));
        return Checkout.redirect(r.path("payment_url").asText());
    }

    public Outcome complete(GatewayContext ctx, Map<String, String> p) {
        if (p.get("payment_reference") == null) return Outcome.failed("Payment was not completed");
        var f = base(ctx.credentials());
        f.add("payment_reference", p.get("payment_reference"));
        JsonNode r = post("verify_payment", f);
        if (!ctx.reference().equals(r.path("reference_no").asText())) return Outcome.failed("Unknown PayTabs payment");
        if (!"100".equals(r.path("response_code").asText())) return Outcome.failed(r.path("transaction_id").asText(null), r.path("result").asText("Declined"));
        return Outcome.paid(r.path("transaction_id").asText(null), null, Money.parse(r.path("amount").asText()));
    }

    private static LinkedMultiValueMap<String, String> base(Credentials c) {
        var f = new LinkedMultiValueMap<String, String>();
        f.add("merchant_email", c.require("merchantEmail"));
        f.add("secret_key", c.require("secretKey"));
        return f;
    }

    private JsonNode post(String op, LinkedMultiValueMap<String, String> form) {
        return Json.parse(gatewayHttp.post().uri(API + op).contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form).retrieve().body(String.class));
    }
}
