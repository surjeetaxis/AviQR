package in.aviqr.paymentgateway.gateway;

/** One setting a hotel enters for a gateway. Secret values are never sent back to the browser. */
public record CredentialField(String key, String label, boolean secret, boolean required, String defaultValue, String help) {
    public static CredentialField secret(String key, String label) { return new CredentialField(key, label, true, true, null, null); }
    public static CredentialField text(String key, String label) { return new CredentialField(key, label, false, true, null, null); }
    public static CredentialField optional(String key, String label, String defaultValue, String help) {
        return new CredentialField(key, label, false, false, defaultValue, help);
    }
    public static CredentialField file(String key, String label, String help) { return new CredentialField(key, label, true, true, null, help); }
}
