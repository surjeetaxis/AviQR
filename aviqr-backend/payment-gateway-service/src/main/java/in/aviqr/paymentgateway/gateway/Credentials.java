package in.aviqr.paymentgateway.gateway;

import java.util.Map;

/** A hotel's decrypted settings for one gateway. */
public record Credentials(Map<String, String> values) {
    public String get(String key) {
        String v = values.get(key);
        return v == null || v.isBlank() ? null : v.trim();
    }
    public String get(String key, String fallback) {
        String v = get(key);
        return v == null ? fallback : v;
    }
    public String require(String key) {
        String v = get(key);
        if (v == null) throw new GatewayException("The hotel's " + key + " for this payment gateway is missing");
        return v;
    }
}
