package in.aviqr.paymentgateway.gateway.providers;

import com.asiapay.secure.SHAPaydollarSecure;
import in.aviqr.paymentgateway.gateway.*;
import org.springframework.stereotype.Component;

import java.util.*;

/** AsiaPay PayDollar / PesoPay (legacy AsiaPayManager). The result arrives as a signed datafeed
 *  posted to /public/notify/asiapay (set as the datafeed URL in the merchant profile); the guest's
 *  return alone proves nothing, so it leaves the payment pending until the datafeed comes. */
@Component
public class AsiaPayProvider implements GatewayProvider {
    public PaymentGateway gateway() { return PaymentGateway.ASIAPAY; }
    public String label() { return "AsiaPay (PayDollar / PesoPay)"; }
    public Verification verification() { return Verification.SIGNED; }
    public List<CredentialField> credentialFields() {
        return List.of(CredentialField.text("merchantId", "Merchant ID"), CredentialField.secret("secureHashSecret", "Secure hash secret"),
            CredentialField.optional("payType", "Pay type", "N", "N = normal sale, H = hold"),
            CredentialField.optional("endpoint", "Payment form URL", "https://www.pesopay.com/b2c2/eng/payment/payForm.jsp",
                "PayDollar: https://www.paydollar.com/b2c2/eng/payment/payForm.jsp"));
    }

    public Checkout begin(GatewayContext ctx) throws Exception {
        Credentials c = ctx.credentials();
        String amount = Money.major(ctx.amount(), ctx.currency()), currency = Money.numeric(ctx.currency()), payType = c.get("payType", "N");
        Map<String, String> f = new LinkedHashMap<>();
        f.put("merchantId", c.require("merchantId"));
        f.put("amount", amount);
        f.put("orderRef", ctx.reference());
        f.put("currCode", currency);
        f.put("successUrl", ctx.callbackUrl());
        f.put("failUrl", ctx.callbackUrl());
        f.put("cancelUrl", ctx.callbackUrl());
        f.put("payType", payType);
        f.put("lang", "E");
        f.put("mpsMode", "NIL");
        f.put("payMethod", "ALL");
        f.put("secureHash", new SHAPaydollarSecure().generatePaymentSecureHash(c.require("merchantId"), ctx.reference(), currency, amount,
            payType, c.require("secureHashSecret")));
        return Checkout.form(c.get("endpoint", "https://www.pesopay.com/b2c2/eng/payment/payForm.jsp"), f);
    }

    public Outcome complete(GatewayContext ctx, Map<String, String> p) {
        if (p.get("secureHash") == null || p.get("successcode") == null) return Outcome.pending("Waiting for AsiaPay's confirmation");
        if (!ctx.reference().equals(p.get("Ref"))) return Outcome.failed("Unknown AsiaPay order");
        boolean valid = new SHAPaydollarSecure().verifyPaymentDatafeed(p.get("src"), p.get("prc"), p.get("successcode"), p.get("Ref"),
            p.get("PayRef"), p.get("Cur"), p.get("Amt"), p.get("payerAuth"), ctx.credentials().require("secureHashSecret"), p.get("secureHash"));
        if (!valid) return Outcome.pending("Datafeed signature invalid; waiting for a valid one");
        if (!"0".equals(p.get("successcode"))) return Outcome.failed(p.get("PayRef"), "Declined (" + p.get("prc") + "/" + p.get("src") + ")");
        return Outcome.paid(p.get("PayRef"), p.get("Ord"), Money.parse(p.get("Amt")));
    }

    public String referenceOf(Map<String, String> p) { return p.get("Ref"); }
}
