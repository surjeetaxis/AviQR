package in.aviqr.paymentgateway.gateway.providers;

import com.fasterxml.jackson.databind.JsonNode;
import com.paytm.pg.merchant.PaytmChecksum;
import in.aviqr.paymentgateway.gateway.*;
import lombok.RequiredArgsConstructor;
import org.json.JSONObject;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.*;

/** Paytm JS Checkout (legacy PaytmManager): initiateTransaction for a token, the checkout script,
 *  then the returned checksum is verified and the order status is read from Paytm. */
@Component @RequiredArgsConstructor
public class PaytmProvider implements GatewayProvider {
    private final RestClient gatewayHttp;

    public PaymentGateway gateway() { return PaymentGateway.SUPPLIER_PAYTM; }
    public String label() { return "Paytm"; }
    public Verification verification() { return Verification.CONFIRMED_WITH_GATEWAY; }
    public List<CredentialField> credentialFields() {
        return List.of(CredentialField.text("mid", "Merchant ID (MID)"), CredentialField.secret("merchantKey", "Merchant key"),
            CredentialField.optional("website", "Website name", "DEFAULT", "WEBSTAGING for test accounts"));
    }

    public Checkout begin(GatewayContext ctx) throws Exception {
        String mid = ctx.credentials().require("mid");
        JSONObject body = new JSONObject();
        body.put("requestType", "Payment");
        body.put("mid", mid);
        body.put("websiteName", ctx.credentials().get("website", ctx.testMode() ? "WEBSTAGING" : "DEFAULT"));
        body.put("orderId", ctx.reference());
        body.put("callbackUrl", ctx.callbackUrl());
        body.put("txnAmount", new JSONObject().put("value", Money.major(ctx.amount(), ctx.currency())).put("currency", ctx.currency()));
        body.put("userInfo", new JSONObject().put("custId", ctx.transactionId().toString()));
        JSONObject request = new JSONObject().put("body", body)
            .put("head", new JSONObject().put("signature", PaytmChecksum.generateSignature(body.toString(), ctx.credentials().require("merchantKey"))));
        JsonNode resp = Json.parse(gatewayHttp.post().uri(host(ctx) + "/theia/api/v1/initiateTransaction?mid={mid}&orderId={ref}", mid, ctx.reference())
            .contentType(MediaType.APPLICATION_JSON).body(request.toString()).retrieve().body(String.class));
        String token = resp.path("body").path("txnToken").asText(null);
        if (token == null) throw new GatewayException("Paytm: " + resp.path("body").path("resultInfo").path("resultMsg").asText("no transaction token"));
        String config = "{root:'',flow:'DEFAULT',data:{orderId:'" + Pages.js(ctx.reference()) + "',token:'" + Pages.js(token)
            + "',tokenType:'TXN_TOKEN',amount:'" + Pages.js(Money.major(ctx.amount(), ctx.currency())) + "'},handler:{notifyMerchant:function(){}}}";
        return Checkout.page(Pages.shell("Paytm", "<script type=\"application/javascript\" crossorigin=\"anonymous\" src=\""
                + Pages.esc(host(ctx) + "/merchantpgpui/checkoutjs/merchants/" + mid + ".js") + "\" onload=\"start()\"></script>"
                + "<script>function start(){if(window.Paytm&&window.Paytm.CheckoutJS){window.Paytm.CheckoutJS.onLoad(function(){"
                + "window.Paytm.CheckoutJS.init(" + config + ").then(function(){window.Paytm.CheckoutJS.invoke();});});}}</script>",
            "<div class=\"spin\"></div><p>Opening Paytm…</p>"));
    }

    public Outcome complete(GatewayContext ctx, Map<String, String> p) throws Exception {
        String key = ctx.credentials().require("merchantKey");
        TreeMap<String, String> params = new TreeMap<>();
        p.forEach((k, v) -> { if (!"CHECKSUMHASH".equalsIgnoreCase(k)) params.put(k, v); });
        if (!ctx.reference().equals(params.get("ORDERID"))) return Outcome.failed("Unknown Paytm order");
        if (!PaytmChecksum.verifySignature(params, key, p.get("CHECKSUMHASH"))) return Outcome.unverified(p.get("TXNID"), "Checksum invalid");
        JSONObject body = new JSONObject().put("mid", ctx.credentials().require("mid")).put("orderId", ctx.reference());
        JSONObject request = new JSONObject().put("body", body).put("head", new JSONObject().put("signature", PaytmChecksum.generateSignature(body.toString(), key)));
        JsonNode status = Json.parse(gatewayHttp.post().uri(host(ctx) + "/v3/order/status").contentType(MediaType.APPLICATION_JSON)
            .body(request.toString()).retrieve().body(String.class)).path("body");
        String result = status.path("resultInfo").path("resultStatus").asText();
        String txn = status.path("txnId").asText(null), bank = status.path("bankTxnId").asText(null);
        return switch (result) {
            case "TXN_SUCCESS" -> Outcome.paid(txn, bank, Money.parse(status.path("txnAmount").asText()));
            case "PENDING" -> Outcome.pending("Paytm payment pending");
            default -> Outcome.failed(txn, status.path("resultInfo").path("resultMsg").asText("Payment failed"));
        };
    }

    private static String host(GatewayContext ctx) { return ctx.testMode() ? "https://securegw-stage.paytm.in" : "https://securegw.paytm.in"; }
}
