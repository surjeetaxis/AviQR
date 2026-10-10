package in.aviqr.paymentgateway.gateway.providers;

import in.aviqr.paymentgateway.gateway.*;

import java.util.*;

/** The MPI redirect protocol shared by Bank of Maldives (BML) and HNB Sentry: a SHA-1 signature
 *  of password+MerID+AcqID+OrderID+amount+currency on the request, and of
 *  password+MerID+AcqID+OrderID+ResponseCode+ReasonCode on the response. */
final class FacMpi {
    private FacMpi() {}

    static Map<String, String> request(GatewayContext ctx, String merchantId, String acquirerId, String password) {
        String amount = Money.minor12(ctx.amount(), ctx.currency()), currency = Money.numeric(ctx.currency());
        Map<String, String> f = new LinkedHashMap<>();
        f.put("Version", "1.0.0");
        f.put("MerID", merchantId);
        f.put("AcqID", acquirerId);
        f.put("MerRespURL", ctx.callbackUrl());
        f.put("PurchaseCurrency", currency);
        f.put("PurchaseCurrencyExponent", Integer.toString(Money.digits(ctx.currency())));
        f.put("OrderID", ctx.reference());
        f.put("PurchaseAmt", amount);
        f.put("Signature", Digests.sha1Base64(password + merchantId + acquirerId + ctx.reference() + amount + currency));
        return f;
    }

    static boolean validResponse(Map<String, String> p, String merchantId, String password) {
        if (!merchantId.equals(p.get("MerID"))) return false;
        String data = password + v(p, "MerID") + v(p, "AcqID") + v(p, "OrderID") + v(p, "ResponseCode") + v(p, "ReasonCode");
        return Digests.exact(Digests.sha1Base64(data), p.get("Signature"));
    }

    private static String v(Map<String, String> p, String k) { return Objects.toString(p.get(k), ""); }
}
