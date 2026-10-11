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

    /** Public PMS endpoints expose a property only if it is public or the request
     *  carries that property's configured private slug/custom host. */
    public boolean isBookingEnginePropertyAvailable(UUID hotelId, String host, String slug) {
        try {
            Map<?, ?> response=restTemplate.getForObject(hotelServiceUrl +
                "/api/v1/hotels/public/booking-engine/properties/{id}?host={host}&slug={slug}", Map.class,
                hotelId, host==null?"":host, slug==null?"":slug);
            return response!=null && response.get("data")!=null;
        } catch (org.springframework.web.client.HttpClientErrorException.NotFound e) {
            return false;
        } catch (Exception e) {
            log.warn("Booking-engine property access check failed for {}: {}", hotelId, e.getMessage());
            return false;
        }
    }

    /** The guest-facing hotel listing (name, address, check-in times) the booking engine shows. */
    public Map<String,Object> bookingEngineProperty(UUID hotelId, String host, String slug) {
        try {
            Map<?, ?> response=restTemplate.getForObject(hotelServiceUrl +
                "/api/v1/hotels/public/booking-engine/properties/{id}?host={host}&slug={slug}", Map.class,
                hotelId, host==null?"":host, slug==null?"":slug);
            Object data=response==null?null:response.get("data");
            return data instanceof Map<?,?> m ? objectMapper.convertValue(m, Map.class) : Map.of();
        } catch (Exception e) {
            log.warn("Could not load booking-engine listing for {}: {}", hotelId, e.getMessage());
            return Map.of();
        }
    }

    /** The storefront URL registered for this hotel's custom booking domain, if the host is one. */
    public java.util.Optional<String> registeredStorefront(UUID hotelId, String host) {
        if (host==null || host.isBlank()) return java.util.Optional.empty();
        try {
            Map<?, ?> response=restTemplate.getForObject(hotelServiceUrl +
                "/api/v1/hotels/public/booking-engine/config?host={host}&slug=", Map.class, host);
            Object data=response==null?null:response.get("data");
            if (data instanceof Map<?,?> m && "TENANT".equals(m.get("mode")) && hotelId.toString().equals(String.valueOf(m.get("propertyId")))
                    && m.get("storefrontUrl") instanceof String url && url.startsWith("https://"))
                return java.util.Optional.of(url);
        } catch (Exception e) {
            log.warn("Could not resolve storefront for {} on {}: {}", hotelId, host, e.getMessage());
        }
        return java.util.Optional.empty();
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

    /** Every active hotel with an email on file — used by the scheduled night-audit
     *  email job, which runs platform-wide rather than for one caller's own hotels.
     *  Calls hotel-service's admin listing directly (bypassing the gateway, same as
     *  every other method here) with a service-internal SUPPORT role, matching the
     *  ADMIN/SUPPORT check on that endpoint. A single large page is fine at this
     *  platform's current hotel count; revisit with real pagination if that changes. */
    public List<HotelInfoDto> getAllActiveHotels() {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-Role", "SUPPORT");
            ResponseEntity<Map> resp = restTemplate.exchange(
                hotelServiceUrl + "/api/v1/hotels/admin/all?size=1000",
                HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            Object data = resp.getBody() != null ? resp.getBody().get("data") : null;
            Object content = data instanceof Map<?, ?> m ? m.get("content") : null;
            if (content == null) return List.of();
            List<HotelInfoDto> hotels = objectMapper.convertValue(content, objectMapper.getTypeFactory()
                .constructCollectionType(List.class, HotelInfoDto.class));
            return hotels.stream()
                .filter(h -> Boolean.TRUE.equals(h.getActive()) && h.getEmail() != null && !h.getEmail().isBlank())
                .toList();
        } catch (Exception e) {
            log.warn("Could not fetch hotel list for night-audit email job: {}", e.getMessage());
            return List.of();
        }
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
