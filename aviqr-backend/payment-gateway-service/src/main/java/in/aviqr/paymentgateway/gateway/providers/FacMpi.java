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
        f.put("Signature", signature(password + merchantId + acquirerId + ctx.reference() + amount + currency));
        return f;
    }

    static boolean validResponse(Map<String, String> p, String merchantId, String password) {
        if (!merchantId.equals(p.get("MerID"))) return false;
        String data = password + v(p, "MerID") + v(p, "AcqID") + v(p, "OrderID") + v(p, "ResponseCode") + v(p, "ReasonCode");
        return Digests.exact(signature(data), p.get("Signature"));
    }

    /** Base64 SHA-1, as the MPI protocol defines its Signature field (SignatureMethod=SHA1); the banks
     *  offer no other algorithm. Accepted in .github/security/sast-exceptions.json. */
    static String signature(String data) {
        try {
            return java.util.Base64.getEncoder().encodeToString(java.security.MessageDigest.getInstance("SHA-1")
                .digest(data.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String v(Map<String, String> p, String k) { return Objects.toString(p.get(k), ""); }
}
