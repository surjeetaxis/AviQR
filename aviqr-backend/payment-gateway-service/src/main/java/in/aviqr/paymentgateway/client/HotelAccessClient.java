package in.aviqr.paymentgateway.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.UUID;

/** Same hotel access check pms-service uses: hotel-service decides who manages a hotel. */
@Service @RequiredArgsConstructor @Slf4j
public class HotelAccessClient {
    private final RestTemplate restTemplate;
    @Value("${hotel.service.url:http://hotel-service}") private String hotelServiceUrl;

    public boolean hasAccess(UUID hotelId, String uid, String role) {
        if (uid == null || uid.isBlank()) return false;
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-Id", uid);
            headers.set("X-User-Role", role == null ? "" : role);
            restTemplate.exchange(hotelServiceUrl + "/api/v1/hotels/" + hotelId + "/access", HttpMethod.GET, new HttpEntity<>(headers), Object.class);
            return true;
        } catch (org.springframework.web.client.HttpClientErrorException.Forbidden e) {
            return false;
        } catch (Exception e) {
            log.warn("Access check failed for hotel {}: {}", hotelId, e.getMessage());
            return false;
        }
    }
}
