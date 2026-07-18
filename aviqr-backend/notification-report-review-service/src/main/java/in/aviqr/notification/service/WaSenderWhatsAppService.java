package in.aviqr.notification.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * WhatsApp messaging via WaSenderAPI (https://wasenderapi.com).
 * Set WASENDER_API_KEY in .env
 * Set app.whatsapp.enabled=true to activate (false = logs only, safe for dev)
 */
@Service @Slf4j
public class WaSenderWhatsAppService {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Value("${wasender.api.key:}")
    private String apiKey;

    @Value("${wasender.api.url:https://wasenderapi.com/api/send-message}")
    private String apiUrl;

    @Value("${app.whatsapp.enabled:false}")
    private boolean enabled;

    /** Send a WhatsApp message. Phone should be a 10-digit Indian number. */
    public void send(String phone, String body) {
        String to = "+91" + normalise(phone);
        if (!enabled) {
            log.info("[WhatsApp MOCK] → {} | {}", to, body.substring(0, Math.min(60, body.length())));
            return;
        }
        try {
            var conn = (HttpURLConnection) new URL(apiUrl).openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setRequestProperty("Authorization", "Bearer " + apiKey);
            conn.setRequestProperty("Content-Type", "application/json");

            ObjectNode payload = MAPPER.createObjectNode();
            payload.put("to", to);
            payload.put("text", body);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(MAPPER.writeValueAsBytes(payload));
            }

            int code = conn.getResponseCode();
            byte[] raw = (code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream()).readAllBytes();
            JsonNode json = MAPPER.readTree(new String(raw, StandardCharsets.UTF_8));

            if (json.path("success").asBoolean(false)) {
                log.info("WhatsApp sent to {} — msgId {}", to, json.path("data").path("msgId").asText(""));
            } else {
                log.warn("WhatsApp send to {} failed: {}", to, json.path("message").asText("HTTP " + code));
            }
        } catch (Exception e) {
            log.error("WhatsApp send failed to {}: {}", to, e.getMessage());
        }
    }

    private String normalise(String phone) {
        return phone.replaceAll("\\s+", "").replaceAll("^\\+91", "").replaceAll("^0+", "");
    }
}
