package in.aviqr.paymentgateway.gateway;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * Everything a provider needs for one transaction.
 * @param reference   our merchant reference: alphanumeric, at most 20 characters, unique
 * @param callbackUrl where the gateway sends the guest (and its result) back to
 * @param notifyUrl   server-to-server notification URL for gateways that have one
 * @param state       provider data kept with the transaction between begin and complete (encrypted at rest)
 */
public record GatewayContext(UUID transactionId, UUID hotelId, String reference, BigDecimal amount, String currency,
                             String description, String guestName, String guestEmail, String guestPhone,
                             String callbackUrl, String notifyUrl, boolean testMode,
                             Credentials credentials, Map<String, String> state) {
    public String firstName() {
        String n = guestName == null ? "" : guestName.trim();
        int i = n.indexOf(' ');
        return i < 0 ? n : n.substring(0, i);
    }
    public String lastName() {
        String n = guestName == null ? "" : guestName.trim();
        int i = n.indexOf(' ');
        return i < 0 ? "." : n.substring(i + 1).trim();
    }
    public String email() { return guestEmail == null ? "" : guestEmail; }
    /** Digits only, without a leading country code separator. */
    public String phoneDigits() { return guestPhone == null ? "" : guestPhone.replaceAll("[^0-9]", ""); }
}
