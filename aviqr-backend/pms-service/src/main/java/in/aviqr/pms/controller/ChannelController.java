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

import java.util.List;
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

    // Public — same reasoning as /webhook above, but matching the real ARI-style
    // accept-booking contract (accessKey-in-body auth, nested Guest/Checkin/Booking/
    // Rates blocks, dd/MM/yyyy dates). See ChannelService.ingestBookingReal.
    @PostMapping("/api/v1/pms/channels/accept-booking")
    public ResponseEntity<ApiResponse<Reservation>> acceptBooking(@RequestBody AcceptBookingRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Booking accepted", channelService.ingestBookingReal(req)));
    }
}
