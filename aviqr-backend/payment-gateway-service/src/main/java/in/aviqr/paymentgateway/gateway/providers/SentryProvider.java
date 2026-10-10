package in.aviqr.paymentgateway.gateway.providers;

import in.aviqr.paymentgateway.gateway.*;
import org.springframework.stereotype.Component;

import java.util.*;

/** HNB Sentry (legacy SentryManager). The legacy service accepted any ResponseCode=1; this
 *  checks the response signature too, and records an unsigned success for staff to confirm. */
@Component
public class SentryProvider implements GatewayProvider {
    public PaymentGateway gateway() { return PaymentGateway.SENTRY; }
    public String label() { return "HNB Sentry"; }
    public Verification verification() { return Verification.SIGNED; }
    public List<CredentialField> credentialFields() {
        return List.of(CredentialField.text("merchantId", "Merchant ID"), CredentialField.text("acquirerId", "Acquirer ID"),
            CredentialField.secret("password", "Password"),
            CredentialField.optional("endpoint", "Payment URL", "https://www.hnbpg.hnb.lk/SENTRY/PaymentGateway/Application/ReDirectLink.aspx", null));
    }

    public Checkout begin(GatewayContext ctx) {
        Credentials c = ctx.credentials();
        Map<String, String> f = FacMpi.request(ctx, c.require("merchantId"), c.require("acquirerId"), c.require("password"));
        f.put("ShipToFirstName", ctx.firstName());
        f.put("ShipToLastName", ctx.lastName());
        f.put("ShipToEMail", ctx.email());
        f.put("ShipToMobile", ctx.phoneDigits());
        f.put("CaptureFlag", "A");
        return Checkout.form(c.get("endpoint", "https://www.hnbpg.hnb.lk/SENTRY/PaymentGateway/Application/ReDirectLink.aspx"), f);
    }

    public Outcome complete(GatewayContext ctx, Map<String, String> p) {
        if (!ctx.reference().equals(p.get("OrderID"))) return Outcome.failed("Unknown Sentry order");
        if (!"1".equals(p.get("ResponseCode")) || !"1".equals(p.get("ReasonCode")))
            return Outcome.failed(p.get("ReferenceNo"), Objects.toString(p.get("ReasonCodeDesc"), "Declined"));
        boolean valid = FacMpi.validResponse(p, ctx.credentials().require("merchantId"), ctx.credentials().require("password"));
        return Outcome.success(valid, p.get("ReferenceNo"), p.get("AuthCode"), null);
    }
}
