package in.aviqr.paymentgateway.gateway.providers;

import in.aviqr.paymentgateway.gateway.*;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/** AgodaPay's charge API takes the card number and CVV directly, so the merchant's own page
 *  would have to collect them (the legacy AgodaPayManager received them from the booking
 *  engine). AviQR only sends guests to gateway-hosted pages and never handles card numbers,
 *  which keeps it out of full PCI DSS scope, so AgodaPay is listed but can't be enabled. */
@Component
public class AgodaPayProvider implements GatewayProvider {
    public PaymentGateway gateway() { return PaymentGateway.AGODAPAY; }
    public String label() { return "AgodaPay"; }
    public Verification verification() { return Verification.CONFIRMED_WITH_GATEWAY; }
    public List<CredentialField> credentialFields() { return List.of(); }
    public String unsupportedReason() {
        return "AgodaPay needs card numbers entered on AviQR's own page; AviQR only uses gateway-hosted payment pages";
    }
    public Checkout begin(GatewayContext ctx) { throw new GatewayException(unsupportedReason()); }
    public Outcome complete(GatewayContext ctx, Map<String, String> params) { return Outcome.failed(unsupportedReason()); }
}
