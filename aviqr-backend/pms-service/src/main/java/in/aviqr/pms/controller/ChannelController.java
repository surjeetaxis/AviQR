package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.AcceptBookingRequest;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.dto.ChannelWebhookRequest;
import in.aviqr.pms.entity.ChannelMapping;
import in.aviqr.pms.entity.ChannelSyncLog;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.repository.ChannelMappingRepository;
import in.aviqr.pms.service.ChannelService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController @RequiredArgsConstructor @Slf4j
public class ChannelController {

    private final ChannelService channelService;
    private final ChannelMappingRepository mappingRepo;
    private final HotelServiceClient hotelServiceClient;

    @PostMapping("/api/v1/pms/channels/mappings")
    public ResponseEntity<ApiResponse<ChannelMapping>> createMapping(
            @RequestBody ChannelMapping req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(req.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Mapping created — share the webhookSecret with the channel manager", channelService.createMapping(req)));
    }

    @GetMapping("/api/v1/pms/channels/mappings/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<ChannelMapping>>> listMappings(
            @PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(channelService.listForHotel(hotelId)));
    }

    @PutMapping("/api/v1/pms/channels/mappings/{id}")
    public ResponseEntity<ApiResponse<ChannelMapping>> updateMapping(
            @PathVariable UUID id, @RequestBody ChannelMapping req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        ChannelMapping existing = mappingRepo.findById(id).orElse(null);
        if (existing == null) return ResponseEntity.notFound().build();
        if (!hotelServiceClient.hasAccess(existing.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Updated", channelService.updateMapping(id, req)));
    }

    @PostMapping("/api/v1/pms/channels/{hotelId}/push")
    public ResponseEntity<ApiResponse<Void>> pushNow(
            @PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        channelService.pushAvailabilityAndRates(hotelId);
        return ResponseEntity.ok(ApiResponse.ok("Push triggered", null));
    }

    @GetMapping("/api/v1/pms/channels/{hotelId}/sync-log")
    public ResponseEntity<ApiResponse<List<ChannelSyncLog>>> syncLog(
            @PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(channelService.syncLog(hotelId)));
    }

    // Public — channel managers have no AviQR user JWT, so this is gateway-routed
    // without AuthenticationFilter and authenticated by the mapping's own shared
    // secret instead (see ChannelService.isValidWebhookSecret).
    @PostMapping("/api/v1/pms/channels/webhook")
    public ResponseEntity<ApiResponse<Reservation>> webhook(
            @RequestBody ChannelWebhookRequest req,
            @RequestHeader(value="X-Channel-Secret", required=false) String secret) {
        if (!channelService.isValidWebhookSecret(req, secret)) {
            log.warn("Rejected channel webhook for {}/{}: invalid or missing secret", req.getChannel(), req.getExternalPropertyId());
            return ResponseEntity.status(403).body(ApiResponse.error("Invalid channel secret"));
        }
        return ResponseEntity.ok(ApiResponse.ok("Booking ingested", channelService.ingestBooking(req)));
    }

    // Public — same reasoning as /webhook above: this is the booking push URL configured
    // for the hotel in the AxisRooms channel manager (accessKey-in-body auth, see
    // ChannelService.ingestBookingReal). AxisRooms reads only the body's "status"
    // ("success" or anything else = failed, retried from its side), so every outcome
    // is HTTP 200 with that shape rather than our ApiResponse envelope.
    @PostMapping("/api/v1/pms/channels/accept-booking")
    public ResponseEntity<Map<String, Object>> acceptBooking(@RequestBody AcceptBookingRequest req) {
        String bookingNo = req.getBookingDetails() != null ? req.getBookingDetails().getBookingNo() : null;
        try {
            Reservation r = channelService.ingestBookingReal(req);
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("status", "success");
            body.put("message", "Booking " + bookingNo + " processed");
            body.put("pmsBookingId", r.getId().toString());
            return ResponseEntity.ok(body);
        } catch (ChannelService.ChannelAuthException e) {
            log.warn("Rejected AxisRooms booking push {}: {}", bookingNo, e.getMessage());
            return ResponseEntity.ok(Map.of("status", "failure", "message", "Authorization failed"));
        } catch (Exception e) {
            log.warn("AxisRooms booking push {} failed: {}", bookingNo, e.getMessage());
            return ResponseEntity.ok(Map.of("status", "failure",
                "message", e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()));
        }
    }
}
