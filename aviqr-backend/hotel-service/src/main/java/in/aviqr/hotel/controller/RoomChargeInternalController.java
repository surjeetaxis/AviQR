package in.aviqr.hotel.controller;
import in.aviqr.hotel.service.RoomChargeEligibility;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

/** Service-to-service only: the "/internal/" path is refused at the gateway and
 *  requires the internal service credential (security-common ServiceTrustConfiguration).
 *  order-service calls it before accepting a ROOM_CHARGE order. */
@RestController @RequiredArgsConstructor
public class RoomChargeInternalController {
    private final RoomChargeEligibility eligibility;

    @GetMapping("/api/v1/hotels/internal/{hotelId}/room-charge-eligibility")
    public ResponseEntity<Map<String, Object>> eligibility(@PathVariable UUID hotelId,
            @RequestParam String shopId, @RequestParam String roomNumber) {
        return ResponseEntity.ok(Map.of("allowed", eligibility.allows(hotelId, shopId, roomNumber)));
    }
}
