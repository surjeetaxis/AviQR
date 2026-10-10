package in.aviqr.paymentgateway.gateway.providers;

import au.com.gateway.client.GatewayClient;
import au.com.gateway.client.component.Redirect;
import au.com.gateway.client.component.TransactionAmount;
import au.com.gateway.client.config.ClientConfig;
import au.com.gateway.client.enums.TransactionType;
import au.com.gateway.client.payment.PaymentCompleteRequest;
import au.com.gateway.client.payment.PaymentCompleteResponse;
import au.com.gateway.client.payment.PaymentInitRequest;
import au.com.gateway.client.payment.PaymentInitResponse;
import in.aviqr.paymentgateway.gateway.*;
import org.springframework.stereotype.Component;

import java.util.*;

/** Sampath Bank through Paycorp (legacy SampathManager): init returns the payment page, and the
 *  result is completed server-side with the request id the bank posts back. */
@Component
public class SampathProvider implements GatewayProvider {
    public PaymentGateway gateway() { return PaymentGateway.SAMPATH; }
    public String label() { return "Sampath Bank (Paycorp)"; }
    public Verification verification() { return Verification.CONFIRMED_WITH_GATEWAY; }
    public List<CredentialField> credentialFields() {
        return List.of(CredentialField.text("clientId", "Client ID"), CredentialField.secret("authToken", "Auth token"),
            CredentialField.secret("hmacSecret", "HMAC secret"),
            CredentialField.optional("endpoint", "Service endpoint", "https://sampath.paycorp.lk/rest/service/proxy", null));
    }

    public Checkout begin(GatewayContext ctx) throws Exception {
        PaymentInitRequest req = new PaymentInitRequest();
        req.setClientId(clientId(ctx));
        req.setTransactionType(TransactionType.PURCHASE);
        TransactionAmount amount = new TransactionAmount();
        amount.setPaymentAmount((int) Money.minor(ctx.amount(), ctx.currency()));
        amount.setCurrency(ctx.currency());
        req.setTransactionAmount(amount);
        Redirect redirect = new Redirect();
        redirect.setReturnUrl(ctx.callbackUrl());
        redirect.setReturnMethod("POST");
        req.setRedirect(redirect);
        req.setClientRef(ctx.reference());
        req.setExtraData(new HashMap<>(Map.of("guestFirstName", ctx.firstName(), "guestLastName", ctx.lastName(),
            "guestEmail", ctx.email(), "guestMobile", ctx.phoneDigits())));
        PaymentInitResponse resp = client(ctx).payment().init(req);
        if (resp == null || resp.getPaymentPageUrl() == null) throw new GatewayException("Paycorp did not return a payment page");
        return Checkout.redirect(resp.getPaymentPageUrl());
    }

    public Outcome complete(GatewayContext ctx, Map<String, String> p) throws Exception {
        if (p.get("reqid") == null) return Outcome.failed("Payment was not completed");
        PaymentCompleteRequest req = new PaymentCompleteRequest();
        req.setReqid(p.get("reqid"));
        req.setClientId(clientId(ctx));
        PaymentCompleteResponse resp = client(ctx).payment().complete(req);
        if (resp == null || !ctx.reference().equals(resp.getClientRef())) return Outcome.failed("Unknown Paycorp payment");
        if (!"00".equals(resp.getResponseCode())) return Outcome.failed(resp.getTxnReference(), Objects.toString(resp.getResponseText(), "Declined"));
        return Outcome.paid(resp.getTxnReference(), resp.getAuthCode(), null);
    }

    private static int clientId(GatewayContext ctx) {
        try { return Integer.parseInt(ctx.credentials().require("clientId")); }
        catch (NumberFormatException e) { throw new GatewayException("The Paycorp client ID must be a number"); }
    }

    private static GatewayClient client(GatewayContext ctx) {
        ClientConfig config = new ClientConfig();
        config.setServiceEndpoint(ctx.credentials().get("endpoint", "https://sampath.paycorp.lk/rest/service/proxy"));
        config.setAuthToken(ctx.credentials().require("authToken"));
        config.setHmacSecret(ctx.credentials().require("hmacSecret"));
        return new GatewayClient(config);
    }
}
