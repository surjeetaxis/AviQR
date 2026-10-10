package in.aviqr.paymentgateway.gateway.providers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/** JSON parsing shared by the providers. */
final class Json {
    static final ObjectMapper MAPPER = new ObjectMapper();
    private Json() {}
    static JsonNode parse(String body) {
        try { return MAPPER.readTree(body == null ? "{}" : body); }
        catch (Exception e) { return MAPPER.createObjectNode(); }
    }
    static String text(JsonNode n, String field) {
        JsonNode v = n.path(field);
        return v.isMissingNode() || v.isNull() ? null : v.asText();
    }
}
