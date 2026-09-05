package in.aviqr.pms.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Everything pms-service needs from payment-service for online payments and
 *  card pre-authorization on a reservation's folio — same cross-service-call
 *  convention as HotelServiceClient. orderId is always the reservationId
 *  (as a string) and shopId is always the hotelId (as a string). */
@Service @RequiredArgsConstructor @Slf4j
public class PaymentServiceClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${payment.service.url:http://payment-service}")
    private String paymentServiceUrl;

    @Value("${internal.sync.secret:}")
    private String internalSyncSecret;

    public Map<String,Object> createOrder(UUID hotelId, UUID reservationId, BigDecimal amount, boolean preAuth) {
        Map<String,Object> body = Map.of(
            "orderId", reservationId.toString(),
            "targetType", preAuth ? "PMS_PREAUTH" : "PMS_FOLIO",
            "amount", amount,
            "currency", "INR",
            "shopId", hotelId.toString(),
            "preAuth", preAuth);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<?,?> resp = restTemplate.exchange(paymentServiceUrl + "/api/v1/payments/create-order",
            HttpMethod.POST, new HttpEntity<>(body, headers), Map.class).getBody();
        Object data = resp != null ? resp.get("data") : null;
        return data != null ? (Map<String,Object>) data : Map.of();
    }

    public Map<String,Object> verify(String razorpayOrderId, String razorpayPaymentId, String razorpaySignature, UUID reservationId) {
        Map<String,Object> body = Map.of(
            "razorpayOrderId", razorpayOrderId,
            "razorpayPaymentId", razorpayPaymentId,
            "razorpaySignature", razorpaySignature,
            "orderId", reservationId.toString());
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<?,?> resp = restTemplate.exchange(paymentServiceUrl + "/api/v1/payments/verify",
            HttpMethod.POST, new HttpEntity<>(body, headers), Map.class).getBody();
        Object data = resp != null ? resp.get("data") : null;
        return data != null ? (Map<String,Object>) data : Map.of();
    }

    public Optional<Map<String,Object>> getByReservation(UUID reservationId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            if (!internalSyncSecret.isBlank()) headers.set("X-Internal-Secret", internalSyncSecret);
            Map<?,?> resp = restTemplate.exchange(paymentServiceUrl + "/api/v1/payments/by-order/" + reservationId,
                HttpMethod.GET, new HttpEntity<>(headers), Map.class).getBody();
            Object data = resp != null ? resp.get("data") : null;
            return data != null ? Optional.of((Map<String,Object>) data) : Optional.empty();
        } catch (org.springframework.web.client.HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }

    public Map<String,Object> capture(String paymentId, UUID hotelId, String uid, String role) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", uid);
        headers.set("X-User-Role", role == null ? "" : role);
        headers.set("X-Shop-Id", hotelId.toString());
        Map<?,?> resp = restTemplate.exchange(paymentServiceUrl + "/api/v1/payments/" + paymentId + "/capture",
            HttpMethod.POST, new HttpEntity<>(headers), Map.class).getBody();
        Object data = resp != null ? resp.get("data") : null;
        return data != null ? (Map<String,Object>) data : Map.of();
    }
}
