package in.aviqr.paymentgateway.gateway.providers;

import in.aviqr.paymentgateway.gateway.*;
import org.springframework.stereotype.Component;

import java.util.*;

/** Bank of Maldives MPI (legacy BmlPayManager). The legacy service kept separate MVR and USD
 *  merchant IDs in code; a hotel with both sets up the currency it charges in. */
@Component
public class BmlProvider implements GatewayProvider {
    public PaymentGateway gateway() { return PaymentGateway.BML; }
    public String label() { return "Bank of Maldives"; }
    public Verification verification() { return Verification.SIGNED; }
    public List<CredentialField> credentialFields() {
        return List.of(CredentialField.text("merchantId", "Merchant ID"), CredentialField.text("acquirerId", "Acquirer ID"),
            CredentialField.secret("password", "Password"));
    }

    public Checkout begin(GatewayContext ctx) {
        Credentials c = ctx.credentials();
        Map<String, String> f = FacMpi.request(ctx, c.require("merchantId"), c.require("acquirerId"), c.require("password"));
        f.put("SignatureMethod", "SHA1");
        return Checkout.form(ctx.testMode() ? "https://ebanking.bankofmaldives.com.mv/bmlmpiuat/threed/MPI"
            : "https://egateway.bankofmaldives.com.mv/bmlmpiprod/threed/MPI", f);
    }

    public Outcome complete(GatewayContext ctx, Map<String, String> p) {
        if (!ctx.reference().equals(p.get("OrderID"))) return Outcome.failed("Unknown BML order");
        boolean valid = FacMpi.validResponse(p, ctx.credentials().require("merchantId"), ctx.credentials().require("password"));
        if (!"1".equals(p.get("ResponseCode"))) return Outcome.failed(p.get("ReferenceNo"), "Declined (reason " + p.get("ReasonCode") + ")");
        return Outcome.success(valid, p.get("ReferenceNo"), p.get("AuthCode"), null);
    }
}
