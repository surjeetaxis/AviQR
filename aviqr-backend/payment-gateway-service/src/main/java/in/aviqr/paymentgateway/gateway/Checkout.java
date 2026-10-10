package in.aviqr.paymentgateway.gateway;

import java.util.LinkedHashMap;
import java.util.Map;

/** How the guest's browser is sent to the gateway: a redirect, an auto-submitted form, or a page of the gateway's own script. */
public record Checkout(Kind kind, String url, Map<String, String> fields, String html) {
    public enum Kind { REDIRECT, FORM_POST, PAGE }
    public static Checkout redirect(String url) { return new Checkout(Kind.REDIRECT, url, Map.of(), null); }
    public static Checkout form(String url, Map<String, String> fields) { return new Checkout(Kind.FORM_POST, url, new LinkedHashMap<>(fields), null); }
    public static Checkout page(String html) { return new Checkout(Kind.PAGE, null, Map.of(), html); }
}
