package in.aviqr.paymentgateway.gateway.providers;

import in.aviqr.paymentgateway.gateway.*;
import org.springframework.stereotype.Component;

import java.util.*;

/** MobiVersa (legacy MobiVersaManager). Its result has no signature, so a success is recorded as
 *  UNVERIFIED for staff to confirm in the MobiVersa portal, never as paid. */
@Component
public class MobiVersaProvider implements GatewayProvider {
    public PaymentGateway gateway() { return PaymentGateway.MOBIVERSA; }
    public String label() { return "MobiVersa"; }
    public Verification verification() { return Verification.UNVERIFIED; }
    public List<CredentialField> credentialFields() {
        return List.of(CredentialField.text("loginId", "Login ID"), CredentialField.secret("mobiApiKey", "MobiVersa API key"),
            CredentialField.optional("postalCode", "Postal code", "560070", null), CredentialField.optional("state", "State", "Karnataka", null));
    }

    public Checkout begin(GatewayContext ctx) {
        Credentials c = ctx.credentials();
        Map<String, String> f = new LinkedHashMap<>();
        f.put("amount", Money.major(ctx.amount(), ctx.currency()));
        f.put("email", ctx.email());
        f.put("firstName", ctx.firstName());
        f.put("lastName", ctx.lastName());
        f.put("loginId", c.require("loginId"));
        f.put("mobiApiKey", c.require("mobiApiKey"));
        f.put("orderId", ctx.reference());
        f.put("postalCode", c.get("postalCode", "560070"));
        f.put("shippingState", c.get("state", "Karnataka"));
        f.put("umResponseUrl", ctx.callbackUrl());
        return Checkout.form(ctx.testMode() ? "https://umtest.mobiversa.com/Pay.aspx" : "https://ezypod.gomobi.io/Pay.aspx", f);
    }

    public Outcome complete(GatewayContext ctx, Map<String, String> p) {
        if (!ctx.reference().equals(p.get("orderId"))) return Outcome.failed("Unknown MobiVersa order");
        if (!"0000".equals(p.get("responseCode"))) return Outcome.failed(p.get("trxId"), Objects.toString(p.get("responseMessage"), "Declined"));
        return Outcome.unverified(p.get("trxId"), "MobiVersa results are unsigned; confirm in the MobiVersa portal");
    }

    public String referenceOf(Map<String, String> p) { return p.get("orderId"); }
}
