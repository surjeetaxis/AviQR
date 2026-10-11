package in.aviqr.pms.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/** Sends transactional email through notification-report-review-service's internal
 *  endpoint, authenticated with the shared internal secret like PaymentServiceClient. */
@Service @RequiredArgsConstructor @Slf4j
public class NotificationClient {

    private final RestTemplate restTemplate;

    @Value("${notification.service.url:http://notification-report-review-service}")
    private String notificationServiceUrl;

    @Value("${internal.sync.secret:}")
    private String internalSyncSecret;

    /** Returns false (and logs) instead of throwing: email must never fail a booking. */
    public boolean sendEmail(String to, String subject, String htmlBody) {
        if (internalSyncSecret.isBlank()) {
            log.warn("Not emailing {}: internal.sync.secret is not configured", subject);
            return false;
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Secret", internalSyncSecret);
            Map<?, ?> response = restTemplate.postForObject(notificationServiceUrl + "/api/v1/notifications/email/send",
                new HttpEntity<>(Map.of("to", to, "subject", subject, "htmlBody", htmlBody), headers), Map.class);
            return response != null && Boolean.TRUE.equals(response.get("data"));
        } catch (Exception e) {
            log.warn("Email '{}' could not be sent: {}", subject, e.getMessage());
            return false;
        }
    }
}
