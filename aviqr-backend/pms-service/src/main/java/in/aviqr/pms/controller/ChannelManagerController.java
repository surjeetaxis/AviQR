package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.*;
import in.aviqr.pms.repository.ChannelMappingRepository;
import in.aviqr.pms.service.ChannelManagerService;
import in.aviqr.pms.service.ChannelService;
import in.aviqr.pms.service.ChannelSyncLogSearch;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** The Channel Manager page: overview, selective sync, channel calendar, sync logs,
 *  channel bookings, and removing a mapping. Mapping create/list/update stay on
 *  ChannelController. */
@RestController @RequiredArgsConstructor
public class ChannelManagerController {

    private final ChannelManagerService channelManagerService;
    private final ChannelService channelService;
    private final ChannelMappingRepository mappingRepo;
    private final HotelServiceClient hotelServiceClient;

    @GetMapping("/api/v1/pms/channels/{hotelId}/overview")
    public ResponseEntity<ApiResponse<ChannelManagerService.Overview>> overview(
            @PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role)) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok(channelManagerService.overview(hotelId)));
    }

    /** Sync now: body is a ChannelService.SyncCommand — any of types (INVENTORY/RATES/
     *  RESTRICTIONS), channel, externalPropertyId, roomTypeIds, mappingIds, from, to.
     *  Answers with the sync-log rows this run wrote. */
    @PostMapping("/api/v1/pms/channels/{hotelId}/sync")
    public ResponseEntity<ApiResponse<List<ChannelSyncLog>>> sync(
            @PathVariable UUID hotelId,
            @RequestBody ChannelService.SyncCommand cmd,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role)) return forbidden();
        List<ChannelSyncLog> rows = channelService.sync(hotelId, cmd, uid);
        long failed = rows.stream().filter(r -> r.getStatus() == SyncStatus.FAILED).count();
        String msg = failed == 0 ? "Synced (" + rows.size() + " request(s))" : failed + " of " + rows.size() + " request(s) failed";
        return ResponseEntity.ok(ApiResponse.ok(msg, rows));
    }

    @GetMapping("/api/v1/pms/channels/{hotelId}/calendar")
    public ResponseEntity<ApiResponse<ChannelManagerService.ChannelCalendar>> calendar(
            @PathVariable UUID hotelId,
            @RequestParam String from, @RequestParam String to,
            @RequestParam(required = false) ChannelName channel,
            @RequestParam(required = false) String propertyId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role)) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok(channelManagerService.calendar(
            hotelId, LocalDate.parse(from), LocalDate.parse(to), channel, propertyId)));
    }

    @GetMapping("/api/v1/pms/channels/{hotelId}/logs")
    public ResponseEntity<ApiResponse<ChannelManagerService.PageResult<ChannelSyncLog>>> logs(
            @PathVariable UUID hotelId,
            @RequestParam(required = false) ChannelName channel,
            @RequestParam(required = false) SyncType type,
            @RequestParam(required = false) SyncStatus status,
            @RequestParam(required = false) SyncDirection direction,
            @RequestParam(required = false) UUID roomTypeId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role)) return forbidden();
        var filter = new ChannelSyncLogSearch.Filter(channel, type, status, direction, roomTypeId,
            from == null || from.isBlank() ? null : LocalDate.parse(from),
            to == null || to.isBlank() ? null : LocalDate.parse(to), q);
        return ResponseEntity.ok(ApiResponse.ok(channelManagerService.logs(hotelId, filter, page, size)));
    }

    @GetMapping("/api/v1/pms/channels/{hotelId}/bookings")
    public ResponseEntity<ApiResponse<ChannelManagerService.PageResult<ChannelManagerService.ChannelBookingRow>>> bookings(
            @PathVariable UUID hotelId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role)) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok(channelManagerService.bookings(hotelId, page, size)));
    }

    /** Removes a mapping outright (Pause keeps it). Bookings already received keep
     *  their reservations; the channel stops getting ARI for it. */
    @DeleteMapping("/api/v1/pms/channels/mappings/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMapping(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        ChannelMapping existing = mappingRepo.findById(id).orElse(null);
        if (existing == null) return ResponseEntity.notFound().build();
        if (!hotelServiceClient.hasAccess(existing.getHotelId(), uid, role)) return forbidden();
        mappingRepo.delete(existing);
        return ResponseEntity.ok(ApiResponse.ok("Mapping removed", null));
    }

    private static <T> ResponseEntity<ApiResponse<T>> forbidden() {
        return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
    }
}
