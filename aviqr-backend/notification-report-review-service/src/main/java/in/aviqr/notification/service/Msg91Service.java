package in.aviqr.notification.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * MSG91 email delivery — set up 2026-08-16, made the only OTP delivery channel 2026-08-18.
 *
 * SMS/WhatsApp OTP delivery (via MSG91 or Twilio) is intentionally not wired up: SMS needs a
 * DLT-approved template ID (India regulatory requirement) and WhatsApp needs a WhatsApp
 * Business number connected to the MSG91 account (real Meta Business verification) — neither
 * is in place, so login/register OTP is email-only until they are.
 *
 * Calls MSG91's account-level AuthKey (msg91.auth.key — NOT the same as the OTP Widget's
 * per-widget auth token), which requires phone-OTP 2FA to reveal from the dashboard, so it has
 * to be supplied by whoever holds that phone, not generated automatically.
 */
@Service @Slf4j
public class Msg91Service {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Value("${msg91.auth.key:}")
    private String authKey;

    // ── Email (Send Email API) ──────────────────────────────────────────────────
    @Value("${msg91.email.domain:aviqr.com}")
    private String emailDomain;

    @Value("${msg91.email.from-address:noreply@aviqr.com}")
    private String emailFromAddress;

    @Value("${msg91.email.from-name:AviQR}")
    private String emailFromName;

    @Value("${msg91.email.otp-template-id:global_otp}")
    private String emailOtpTemplateId;

    @Value("${app.msg91.email.enabled:true}")
    private boolean emailEnabled;

    /** Send an OTP via email using MSG91's pre-approved "global_otp" template. Works today. */
    public boolean sendOtpEmail(String toEmail, String toName, String otp) {
        if (!emailEnabled) {
            log.info("[MSG91 EMAIL MOCK] → {} | otp={}", toEmail, otp);
            return true;
        }
        try {
            ObjectNode toEntry = MAPPER.createObjectNode();
            toEntry.put("name", toName != null && !toName.isBlank() ? toName : toEmail);
            toEntry.put("email", toEmail);
            ArrayNode toArr = MAPPER.createArrayNode();
            toArr.add(toEntry);

            ObjectNode variables = MAPPER.createObjectNode();
            variables.put("company_name", "AviQR");
            variables.put("otp", otp);

            ObjectNode recipient = MAPPER.createObjectNode();
            recipient.set("to", toArr);
            recipient.set("variables", variables);
            ArrayNode recipients = MAPPER.createArrayNode();
            recipients.add(recipient);

            ObjectNode from = MAPPER.createObjectNode();
            from.put("name", emailFromName);
            from.put("email", emailFromAddress);

            ObjectNode payload = MAPPER.createObjectNode();
            payload.set("recipients", recipients);
            payload.set("from", from);
            payload.put("domain", emailDomain);
            payload.put("template_id", emailOtpTemplateId);

            JsonNode resp = post("https://control.msg91.com/api/v5/email/send", payload);
            boolean ok = resp.path("status").asText("").equalsIgnoreCase("success") || resp.has("data");
            if (!ok) log.warn("MSG91 Email send to {} failed: {}", toEmail, resp);
            else log.info("MSG91 Email sent to {}", toEmail);
            return ok;
        } catch (Exception e) {
            log.error("MSG91 Email send failed to {}: {}", toEmail, e.getMessage());
            return false;
        }
    }

    private JsonNode post(String url, ObjectNode payload) throws Exception {
        var conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        conn.setRequestProperty("accept", "application/json");
        conn.setRequestProperty("authkey", authKey);
        conn.setRequestProperty("content-type", "application/json");
        try (OutputStream os = conn.getOutputStream()) {
            os.write(MAPPER.writeValueAsBytes(payload));
        }
        int code = conn.getResponseCode();
        byte[] raw = (code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream()).readAllBytes();
        return MAPPER.readTree(new String(raw, StandardCharsets.UTF_8));
    }
}
