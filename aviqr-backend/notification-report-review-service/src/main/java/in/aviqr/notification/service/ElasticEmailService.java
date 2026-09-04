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
 * Transactional email via Elastic Email (https://elasticemail.com).
 * Set ELASTIC_EMAIL_API_KEY in .env
 * Set app.email.enabled=true to activate (false = logs only, safe for dev)
 */
@Service @Slf4j
public class ElasticEmailService {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Value("${elasticemail.api.key:}")
    private String apiKey;

    @Value("${elasticemail.api.url:https://api.elasticemail.com/v4/emails/transactional}")
    private String apiUrl;

    @Value("${elasticemail.from:noreply@aviqr.com}")
    private String fromEmail;

    @Value("${app.email.enabled:false}")
    private boolean enabled;

    /** Send a transactional HTML email. Returns true on success (or mock mode). */
    public boolean send(String to, String subject, String htmlBody) {
        return send(to, subject, htmlBody, null, null, null);
    }

    /** Same as above, with one optional attachment (e.g. the scheduled night-audit
     *  PDF) — attachmentName/attachmentContentType/attachmentBase64 must all be
     *  non-null together, or all left null for a plain email. */
    public boolean send(String to, String subject, String htmlBody,
                         String attachmentName, String attachmentContentType, String attachmentBase64) {
        if (!enabled) {
            log.info("[Email MOCK] → {} | {}{}", to, subject, attachmentName != null ? " (attachment: " + attachmentName + ")" : "");
            return true;
        }
        try {
            var conn = (HttpURLConnection) new URL(apiUrl).openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setRequestProperty("X-ElasticEmail-ApiKey", apiKey);
            conn.setRequestProperty("Content-Type", "application/json");

            ObjectNode bodyBlock = MAPPER.createObjectNode();
            bodyBlock.put("ContentType", "HTML");
            bodyBlock.put("Content", htmlBody);

            ObjectNode content = MAPPER.createObjectNode();
            content.put("From", fromEmail);
            content.put("Subject", subject);
            content.putArray("Body").add(bodyBlock);
            if (attachmentBase64 != null) {
                ObjectNode attachment = MAPPER.createObjectNode();
                attachment.put("Name", attachmentName);
                attachment.put("ContentType", attachmentContentType);
                attachment.put("BinaryContent", attachmentBase64);
                content.putArray("Attachments").add(attachment);
            }

            ObjectNode recipients = MAPPER.createObjectNode();
            recipients.putArray("To").add(to);

            ObjectNode payload = MAPPER.createObjectNode();
            payload.set("Recipients", recipients);
            payload.set("Content", content);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(MAPPER.writeValueAsBytes(payload));
            }

            int code = conn.getResponseCode();
            byte[] raw = (code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream()).readAllBytes();
            String responseBody = new String(raw, StandardCharsets.UTF_8);

            if (code >= 200 && code < 300) {
                JsonNode json = MAPPER.readTree(responseBody);
                log.info("Email sent to {} — messageId {}", to, json.path("MessageID").asText(""));
                return true;
            }
            log.warn("Email send to {} failed: HTTP {} — {}", to, code, responseBody);
            return false;
        } catch (Exception e) {
            log.error("Email send failed to {}: {}", to, e.getMessage());
            return false;
        }
    }
}
