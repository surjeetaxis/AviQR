package in.aviqr.pms.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Everything pms-service needs from hotel-service: physical room inventory (for
 * availability) and occupancy sync on check-in/out, so hotel-service's QR
 * guest-services dashboard keeps reflecting who's actually in the room without
 * pms-service ever writing into hotel-service's own tables directly (see
 * OutletShopProxyController for the same cross-service-call convention).
 */
@Service @RequiredArgsConstructor @Slf4j
public class HotelServiceClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${hotel.service.url:http://hotel-service}")
    private String hotelServiceUrl;

    public List<HotelRoomDto> getRooms(UUID hotelId) {
        Map<?, ?> resp = restTemplate.getForObject(
            hotelServiceUrl + "/api/v1/rooms/hotel/" + hotelId, Map.class);
        Object data = resp != null ? resp.get("data") : null;
        if (data == null) return List.of();
        return objectMapper.convertValue(data, objectMapper.getTypeFactory()
            .constructCollectionType(List.class, HotelRoomDto.class));
    }

    /** Delegates the access check to hotel-service's own HotelAccessController — a 200
     *  means the caller has access to this hotel, a 403 means they don't. */
    public boolean hasAccess(UUID hotelId, String uid, String role) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-Id", uid);
            headers.set("X-User-Role", role == null ? "" : role);
            restTemplate.exchange(
                hotelServiceUrl + "/api/v1/hotels/" + hotelId + "/access",
                HttpMethod.GET, new HttpEntity<>(headers), Object.class);
            return true;
        } catch (org.springframework.web.client.HttpClientErrorException.Forbidden e) {
            return false;
        } catch (Exception e) {
            log.warn("Access check failed for hotel {}: {}", hotelId, e.getMessage());
            return false;
        }
    }

    /** Delegates to hotel-service's ChainController, which only lets the chain's owner
     *  (or ADMIN/SUPPORT) see its member hotels — a Forbidden here propagates as one,
     *  since a chain report has no meaningful partial-access notion to fall back to. */
    public List<HotelSummaryDto> getHotelsInChain(UUID chainId, String uid, String role) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", uid);
        headers.set("X-User-Role", role == null ? "" : role);
        ResponseEntity<Map> resp = restTemplate.exchange(
            hotelServiceUrl + "/api/v1/chains/" + chainId + "/hotels",
            HttpMethod.GET, new HttpEntity<>(headers), Map.class);
        Object data = resp.getBody() != null ? resp.getBody().get("data") : null;
        if (data == null) return List.of();
        return objectMapper.convertValue(data, objectMapper.getTypeFactory()
            .constructCollectionType(List.class, HotelSummaryDto.class));
    }

    public Optional<UUID> findRoomId(UUID hotelId, String roomNumber) {
        return getRooms(hotelId).stream()
            .filter(r -> roomNumber.equals(r.getRoomNumber()))
            .map(HotelRoomDto::getId)
            .findFirst();
    }

    public void updateRoomOccupancy(UUID roomId, String guestName, String checkInDate,
                                     String checkOutDate, String status) {
        try {
            Map<String, Object> body = Map.of(
                "guestName", guestName == null ? "" : guestName,
                "checkInDate", checkInDate == null ? "" : checkInDate,
                "checkOutDate", checkOutDate == null ? "" : checkOutDate,
                "status", status);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            restTemplate.exchange(hotelServiceUrl + "/api/v1/rooms/" + roomId + "/occupancy",
                HttpMethod.PUT, new HttpEntity<>(body, headers), Void.class);
        } catch (Exception e) {
            log.warn("Failed to sync occupancy for room {}: {}", roomId, e.getMessage());
        }
    }
}
