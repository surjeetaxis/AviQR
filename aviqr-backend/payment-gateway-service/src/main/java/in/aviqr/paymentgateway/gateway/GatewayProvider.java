package in.aviqr.paymentgateway.gateway;

import java.util.List;
import java.util.Map;

/** One payment gateway: starts a hosted payment and reads the gateway's result. */
public interface GatewayProvider {
    PaymentGateway gateway();
    String label();
    List<CredentialField> credentialFields();
    Verification verification();

    /** Sends the guest to the gateway. Anything needed later goes in ctx.state(). */
    Checkout begin(GatewayContext ctx) throws Exception;

    /** Reads the gateway's response (browser return or server notification) for this transaction. */
    Outcome complete(GatewayContext ctx, Map<String, String> params) throws Exception;

    /** Our reference in a response that arrives without our transaction id in the URL. */
    default String referenceOf(Map<String, String> params) { return null; }

    /** Why this gateway can't take hosted payments, or null when it can. */
    default String unsupportedReason() { return null; }
}
