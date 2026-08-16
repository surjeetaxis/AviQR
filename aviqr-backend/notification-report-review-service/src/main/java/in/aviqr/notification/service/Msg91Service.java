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
 * MSG91 delivery for SMS, WhatsApp, and Email — set up 2026-08-16 as a second/production
 * channel alongside TwilioSmsService, WaSenderWhatsAppService, and ElasticEmailService.
 *
 * Each channel is independently gated and defaults to the state that matched MSG91's actual
 * account setup at the time this was written — flip the flag once the underlying MSG91
 * account resource is ready:
 *   - Email: app.msg91.email.enabled=true (default ON) — the aviqr.com sending domain and
 *     the "global_otp" template were already verified/pre-approved on the account, so this
 *     works today.
 *   - SMS:   app.msg91.sms.enabled=false (default OFF) — needs a DLT-approved template ID
 *     (India regulatory requirement) in msg91.sms.template-id before this can send anything;
 *     until then MSG91 will reject every request.
 *   - WhatsApp: app.msg91.whatsapp.enabled=false (default OFF) — needs a WhatsApp Business
 *     number connected to the MSG91 account (Account > WhatsApp > Number > Add Number, a real
 *     Meta Business verification flow) before msg91.whatsapp.integrated-number has a real
 *     value to send from.
 *
 * All three call MSG91's account-level AuthKey (msg91.auth.key — NOT the same as the OTP
 * Widget's per-widget auth token), which requires phone-OTP 2FA to reveal from the dashboard,
 * so it has to be supplied by whoever holds that phone, not generated automatically.
 */
@Service @Slf4j
public class Msg91Service {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Value("${msg91.auth.key:}")
    private String authKey;

    // ── SMS (Flow API) ──────────────────────────────────────────────────────────
    @Value("${msg91.sms.template-id:}")
    private String smsTemplateId;

    @Value("${msg91.sms.otp-variable-name:OTP}")
    private String smsOtpVariableName;

    @Value("${app.msg91.sms.enabled:false}")
    private boolean smsEnabled;

    // ── WhatsApp (Template API) ─────────────────────────────────────────────────
    @Value("${msg91.whatsapp.integrated-number:}")
    private String whatsappIntegratedNumber;

    @Value("${msg91.whatsapp.template-name:}")
    private String whatsappTemplateName;

    @Value("${msg91.whatsapp.template-language:en}")
    private String whatsappTemplateLanguage;

    @Value("${app.msg91.whatsapp.enabled:false}")
    private boolean whatsappEnabled;

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

    /** Send an OTP via SMS using the DLT-approved template. No-op (logged) until smsTemplateId is set. */
    public boolean sendOtpSms(String phone, String otp) {
        String to = "91" + normalise(phone);
        if (!smsEnabled) {
            log.info("[MSG91 SMS MOCK] → {} | otp={}", to, otp);
            return true;
        }
        if (smsTemplateId.isBlank()) {
            log.warn("MSG91 SMS enabled but msg91.sms.template-id is blank (DLT template not yet approved) — skipping send to {}", to);
            return false;
        }
        try {
            ObjectNode recipient = MAPPER.createObjectNode();
            recipient.put("mobiles", to);
            recipient.put(smsOtpVariableName, otp);
            ArrayNode recipients = MAPPER.createArrayNode();
            recipients.add(recipient);

            ObjectNode payload = MAPPER.createObjectNode();
            payload.put("template_id", smsTemplateId);
            payload.put("short_url", "0");
            payload.set("recipients", recipients);

            JsonNode resp = post("https://control.msg91.com/api/v5/flow", payload);
            boolean ok = "success".equalsIgnoreCase(resp.path("type").asText(""));
            if (!ok) log.warn("MSG91 SMS send to {} failed: {}", to, resp);
            return ok;
        } catch (Exception e) {
            log.error("MSG91 SMS send failed to {}: {}", to, e.getMessage());
            return false;
        }
    }

    /** Send an OTP via WhatsApp template. No-op (logged) until a WhatsApp Business number is connected. */
    public boolean sendOtpWhatsapp(String phone, String otp) {
        String to = "91" + normalise(phone);
        if (!whatsappEnabled) {
            log.info("[MSG91 WHATSAPP MOCK] → {} | otp={}", to, otp);
            return true;
        }
        if (whatsappIntegratedNumber.isBlank() || whatsappTemplateName.isBlank()) {
            log.warn("MSG91 WhatsApp enabled but integrated-number/template-name is blank (WhatsApp Business number not yet connected) — skipping send to {}", to);
            return false;
        }
        try {
            ObjectNode body1 = MAPPER.createObjectNode();
            body1.put("type", "text");
            body1.put("value", otp);
            ObjectNode components = MAPPER.createObjectNode();
            components.set("body_1", body1);

            ObjectNode toAndComponent = MAPPER.createObjectNode();
            ArrayNode toArr = MAPPER.createArrayNode();
            toArr.add(to);
            toAndComponent.set("to", toArr);
            toAndComponent.set("components", components);
            ArrayNode toAndComponents = MAPPER.createArrayNode();
            toAndComponents.add(toAndComponent);

            ObjectNode language = MAPPER.createObjectNode();
            language.put("code", whatsappTemplateLanguage);
            language.put("policy", "deterministic");

            ObjectNode template = MAPPER.createObjectNode();
            template.put("name", whatsappTemplateName);
            template.set("language", language);
            template.set("to_and_components", toAndComponents);

            ObjectNode payloadInner = MAPPER.createObjectNode();
            payloadInner.put("type", "template");
            payloadInner.set("template", template);

            ObjectNode payload = MAPPER.createObjectNode();
            payload.put("integrated_number", whatsappIntegratedNumber);
            payload.put("content_type", "template");
            payload.set("payload", payloadInner);

            JsonNode resp = post("https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/", payload);
            log.info("MSG91 WhatsApp send to {} — response {}", to, resp);
            return true;
        } catch (Exception e) {
            log.error("MSG91 WhatsApp send failed to {}: {}", to, e.getMessage());
            return false;
        }
    }

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

    private String normalise(String phone) {
        // Input is always a validated 10-digit Indian mobile (^[6-9]\d{9}$, see SendOtpRequest) —
        // only strip a +91 that a caller might have prepended, never a bare "91" (that would
        // wrongly truncate a real 10-digit number starting with 91xxxxxxxx... no such prefix
        // exists for [6-9]-leading numbers, but keep this narrow to avoid ever double-stripping).
        return phone.replaceAll("\\s+", "").replaceAll("^\\+91", "").replaceAll("^0+", "");
    }
}
