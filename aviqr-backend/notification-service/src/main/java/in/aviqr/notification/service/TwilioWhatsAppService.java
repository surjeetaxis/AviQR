package in.aviqr.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * WhatsApp messaging via Twilio.
 * Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM in .env
 * Set app.whatsapp.enabled=true to activate (false = logs only, safe for dev)
 *
 * Production: use Meta WhatsApp Business API with pre-approved message templates.
 * Sandbox: customers must send "join <keyword>" to +14155238886 once.
 */
@Service @Slf4j
public class TwilioWhatsAppService {

    @Value("${twilio.account.sid:}") private String sid;
    @Value("${twilio.auth.token:}")  private String token;
    @Value("${twilio.whatsapp.from:whatsapp:+14155238886}") private String from;
    @Value("${app.whatsapp.enabled:false}") private boolean enabled;

    /** Send a WhatsApp message. Phone should be 10-digit Indian number. */
    public void send(String phone, String body) {
        String to = normalise(phone);
        if (!enabled) {
            log.info("[WhatsApp MOCK] → {} | {}", to, body.substring(0, Math.min(60, body.length())));
            return;
        }
        try {
            // Using plain HTTP call to avoid Twilio SDK classpath issues in some setups
            var url = new java.net.URL("https://api.twilio.com/2010-04-01/Accounts/" + sid + "/Messages.json");
            var conn = (java.net.HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            String auth = java.util.Base64.getEncoder().encodeToString((sid + ":" + token).getBytes());
            conn.setRequestProperty("Authorization", "Basic " + auth);
            conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
            String data = "From=" + java.net.URLEncoder.encode(from, "UTF-8")
                + "&To="   + java.net.URLEncoder.encode("whatsapp:+91" + to, "UTF-8")
                + "&Body=" + java.net.URLEncoder.encode(body, "UTF-8");
            conn.getOutputStream().write(data.getBytes());
            int code = conn.getResponseCode();
            log.info("WhatsApp sent to +91{} — HTTP {}", to, code);
        } catch (Exception e) {
            log.error("WhatsApp send failed to +91{}: {}", to, e.getMessage());
        }
    }

    private String normalise(String phone) {
        return phone.replaceAll("\\s+","").replaceAll("^\\+91","").replaceAll("^0+","");
    }
}
