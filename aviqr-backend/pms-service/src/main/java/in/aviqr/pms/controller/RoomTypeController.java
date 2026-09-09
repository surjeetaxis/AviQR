package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.dto.RoomTypeInventoryBulkRequest;
import in.aviqr.pms.dto.RoomTypeInventoryUpdateRequest;
import in.aviqr.pms.entity.RoomType;
import in.aviqr.pms.entity.RoomTypeInventory;
import in.aviqr.pms.repository.RoomTypeInventoryRepository;
import in.aviqr.pms.repository.RoomTypeRepository;
import in.aviqr.pms.service.ChannelService;
import in.aviqr.pms.service.RateChangeLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController @RequiredArgsConstructor @Slf4j
public class RoomTypeController {

    private final RoomTypeRepository roomTypeRepo;
    private final RoomTypeInventoryRepository inventoryRepo;
    private final HotelServiceClient hotelServiceClient;
    private final RateChangeLogService changeLog;
    private final ChannelService channelService;

    @PostMapping("/api/v1/pms/room-types")
    public ResponseEntity<ApiResponse<RoomType>> create(
            @RequestBody RoomType req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(req.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        req.setId(null);
        return ResponseEntity.ok(ApiResponse.ok("Created", roomTypeRepo.save(req)));
    }

    @GetMapping("/api/v1/pms/room-types/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<RoomType>>> listForHotel(@PathVariable UUID hotelId) {
        return ResponseEntity.ok(ApiResponse.ok(roomTypeRepo.findByHotelIdAndActiveTrue(hotelId)));
    }

    @PutMapping("/api/v1/pms/room-types/{id}")
    public ResponseEntity<ApiResponse<RoomType>> update(
            @PathVariable UUID id, @RequestBody RoomType req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        return roomTypeRepo.findById(id).map(rt -> {
            if (!hotelServiceClient.hasAccess(rt.getHotelId(), uid, role))
                return ResponseEntity.status(403).<ApiResponse<RoomType>>body(ApiResponse.error("Forbidden"));
            rt.setName(req.getName());
            rt.setDescription(req.getDescription());
            rt.setMaxOccupancy(req.getMaxOccupancy());
            if (req.getActive() != null) rt.setActive(req.getActive());
            return ResponseEntity.ok(ApiResponse.ok("Updated", roomTypeRepo.save(rt)));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Per-date inventory (sellable-room cap, independent of physical count) ──
    @PutMapping("/api/v1/pms/room-types/{id}/inventory")
    public ResponseEntity<ApiResponse<RoomTypeInventory>> setInventory(
            @PathVariable UUID id, @RequestBody RoomTypeInventoryUpdateRequest req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        RoomType rt = roomTypeRepo.findById(id).orElse(null);
        if (rt == null) return ResponseEntity.notFound().build();
        if (!hotelServiceClient.hasAccess(rt.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));

        RoomTypeInventory saved = applyInventory(rt, req.getDate(), req.getAllotment(), uid);
        if (Boolean.TRUE.equals(req.getAutoSync())) triggerAutoSync(id);
        return ResponseEntity.ok(ApiResponse.ok("Saved", saved));
    }

    // Bulk variant: same allotment applied to every date in the list — the Inventory &
    // Rates Calendar's "apply to selected dates" action for allotment.
    @PutMapping("/api/v1/pms/room-types/{id}/inventory/bulk")
    public ResponseEntity<ApiResponse<List<RoomTypeInventory>>> bulkSetInventory(
            @PathVariable UUID id, @RequestBody RoomTypeInventoryBulkRequest req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        RoomType rt = roomTypeRepo.findById(id).orElse(null);
        if (rt == null) return ResponseEntity.notFound().build();
        if (!hotelServiceClient.hasAccess(rt.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        if (req.getDates() == null || req.getDates().isEmpty())
            return ResponseEntity.badRequest().body(ApiResponse.error("At least one date is required"));
        if (req.getAllotment() == null)
            return ResponseEntity.badRequest().body(ApiResponse.error("Allotment is required"));

        List<RoomTypeInventory> saved = req.getDates().stream()
            .map(date -> applyInventory(rt, date, req.getAllotment(), uid))
            .toList();
        if (Boolean.TRUE.equals(req.getAutoSync())) triggerAutoSync(id);
        return ResponseEntity.ok(ApiResponse.ok("Saved " + saved.size() + " date(s)", saved));
    }

    private RoomTypeInventory applyInventory(RoomType rt, LocalDate date, Integer allotment, String uid) {
        RoomTypeInventory existing = inventoryRepo.findByRoomTypeIdAndDate(rt.getId(), date).orElse(null);
        if (existing != null) {
            changeLog.logIfChanged(rt.getHotelId(), rt.getId(), null, date, "allotment", existing.getAllotment(), allotment, uid);
            existing.setAllotment(allotment);
            return inventoryRepo.save(existing);
        }
        RoomTypeInventory saved = inventoryRepo.save(
            RoomTypeInventory.builder().roomTypeId(rt.getId()).date(date).allotment(allotment).build());
        changeLog.logIfChanged(rt.getHotelId(), rt.getId(), null, date, "allotment", null, allotment, uid);
        return saved;
    }

    // Fire-and-log-only: a sync failure must never fail the inventory save that
    // triggered it — the push's own success/failure is recorded per-mapping in the
    // channel sync log.
    private void triggerAutoSync(UUID roomTypeId) {
        try {
            channelService.pushForRoomType(roomTypeId);
        } catch (Exception e) {
            log.warn("Auto-sync push failed for room type {}: {}", roomTypeId, e.getMessage());
        }
    }

    @GetMapping("/api/v1/pms/room-types/{id}/inventory")
    public ResponseEntity<ApiResponse<List<RoomTypeInventory>>> listInventory(
            @PathVariable UUID id, @RequestParam String from, @RequestParam String to) {
        return ResponseEntity.ok(ApiResponse.ok(
            inventoryRepo.findByRoomTypeIdAndDateBetween(id, LocalDate.parse(from), LocalDate.parse(to))));
    }
}
