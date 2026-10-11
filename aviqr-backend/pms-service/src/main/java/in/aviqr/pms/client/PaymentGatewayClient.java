package in.aviqr.pms.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** payment-gateway-service's internal API: hotels' own gateways for booking-engine payments. */
@Service @RequiredArgsConstructor @Slf4j
public class PaymentGatewayClient {
    private final RestTemplate restTemplate;

    @Value("${payment.gateway.service.url:http://payment-gateway-service}") private String baseUrl;
    @Value("${internal.sync.secret:}") private String internalSecret;

    public record Payment(UUID id, String reference, String gateway, BigDecimal amount, String currency, String status, String payUrl, String message) { }

    /** The gateway guests of this hotel can pay through, if the hotel has set one up. */
    public Optional<String> gatewayLabel(UUID hotelId) {
        try {
            Map<?, ?> data = data(restTemplate.exchange(baseUrl + "/api/v1/payment-gateway/internal/hotels/" + hotelId + "/checkout-option",
                HttpMethod.GET, new HttpEntity<>(headers()), Map.class).getBody());
            return data == null ? Optional.empty() : Optional.ofNullable((String) data.get("label"));
        } catch (Exception e) {
            log.warn("Payment gateway lookup failed for hotel {}: {}", hotelId, e.getMessage());
            return Optional.empty();
        }
    }

    public Payment create(UUID hotelId, BigDecimal amount, String currency, UUID reservationId, String description,
                          String returnUrl, String guestName, String guestEmail, String guestPhone) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("hotelId", hotelId);
        body.put("amount", amount);
        body.put("currency", currency);
        body.put("purpose", "BOOKING_DEPOSIT");
        body.put("externalReference", reservationId.toString());
        body.put("description", description);
        body.put("returnUrl", returnUrl);
        body.put("guestName", guestName);
        body.put("guestEmail", guestEmail);
        body.put("guestPhone", guestPhone);
        try {
            return payment(data(restTemplate.exchange(baseUrl + "/api/v1/payment-gateway/internal/transactions", HttpMethod.POST,
                new HttpEntity<>(body, headers()), Map.class).getBody()));
        } catch (HttpClientErrorException.BadRequest e) {
            throw new IllegalArgumentException("Online payment couldn't start: " + message(e));
        }
    }

    public Optional<Payment> get(UUID paymentId) {
        try {
            return Optional.ofNullable(payment(data(restTemplate.exchange(baseUrl + "/api/v1/payment-gateway/internal/transactions/" + paymentId,
                HttpMethod.GET, new HttpEntity<>(headers()), Map.class).getBody())));
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }

    private HttpHeaders headers() {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        h.set("X-Internal-Secret", internalSecret);
        return h;
    }

    private static Map<?, ?> data(Map<?, ?> resp) { return resp == null ? null : (Map<?, ?>) resp.get("data"); }

    private static Payment payment(Map<?, ?> d) {
        if (d == null) return null;
        return new Payment(UUID.fromString(d.get("id").toString()), (String) d.get("reference"), (String) d.get("gateway"),
            new BigDecimal(d.get("amount").toString()), (String) d.get("currency"), (String) d.get("status"), (String) d.get("payUrl"), (String) d.get("message"));
    }

    private static String message(HttpClientErrorException e) {
        String body = e.getResponseBodyAsString();
        int i = body.indexOf("\"message\":\"");
        return i < 0 ? "the gateway refused it" : body.substring(i + 11, Math.max(i + 11, body.indexOf('"', i + 11)));
    }
}
