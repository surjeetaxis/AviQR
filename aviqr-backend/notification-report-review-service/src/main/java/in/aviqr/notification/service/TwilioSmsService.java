package in.aviqr.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Plain SMS via Twilio (CRM campaigns — birthday/anniversary wishes, segment broadcasts).
 * Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM in .env
 * Set app.sms.enabled=true to activate (false = logs only, safe for dev)
 */
@Service @Slf4j
public class TwilioSmsService {

    @Value("${twilio.account.sid:}") private String sid;
    @Value("${twilio.auth.token:}")  private String token;
    @Value("${twilio.sms.from:}")    private String from;
    @Value("${app.sms.enabled:false}") private boolean enabled;

    /** Send an SMS. Phone should be 10-digit Indian number. Returns true on success (or mock mode). */
    public boolean send(String phone, String body) {
        String to = normalise(phone);
        if (!enabled) {
            log.info("[SMS MOCK] → {} | {}", to, body.substring(0, Math.min(60, body.length())));
            return true;
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
                + "&To="   + java.net.URLEncoder.encode("+91" + to, "UTF-8")
                + "&Body=" + java.net.URLEncoder.encode(body, "UTF-8");
            conn.getOutputStream().write(data.getBytes());
            int code = conn.getResponseCode();
            log.info("SMS sent to +91{} — HTTP {}", to, code);
            return code >= 200 && code < 300;
        } catch (Exception e) {
            log.error("SMS send failed to +91{}: {}", to, e.getMessage());
            return false;
        }
    }

    private String normalise(String phone) {
        return phone.replaceAll("\\s+","").replaceAll("^\\+91","").replaceAll("^0+","");
    }
}
