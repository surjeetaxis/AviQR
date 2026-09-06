package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.RoomType;
import in.aviqr.pms.entity.RoomTypeInventory;
import in.aviqr.pms.repository.RoomTypeInventoryRepository;
import in.aviqr.pms.repository.RoomTypeRepository;
import in.aviqr.pms.service.RateChangeLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class RoomTypeController {

    private final RoomTypeRepository roomTypeRepo;
    private final RoomTypeInventoryRepository inventoryRepo;
    private final HotelServiceClient hotelServiceClient;
    private final RateChangeLogService changeLog;

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
            @PathVariable UUID id, @RequestBody RoomTypeInventory req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        RoomType rt = roomTypeRepo.findById(id).orElse(null);
        if (rt == null) return ResponseEntity.notFound().build();
        if (!hotelServiceClient.hasAccess(rt.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));

        RoomTypeInventory existing = inventoryRepo.findByRoomTypeIdAndDate(id, req.getDate()).orElse(null);
        if (existing != null) {
            changeLog.logIfChanged(rt.getHotelId(), id, null, req.getDate(),
                "allotment", existing.getAllotment(), req.getAllotment(), uid);
            existing.setAllotment(req.getAllotment());
            return ResponseEntity.ok(ApiResponse.ok("Saved", inventoryRepo.save(existing)));
        }
        req.setId(null);
        req.setRoomTypeId(id);
        RoomTypeInventory saved = inventoryRepo.save(req);
        changeLog.logIfChanged(rt.getHotelId(), id, null, req.getDate(), "allotment", null, req.getAllotment(), uid);
        return ResponseEntity.ok(ApiResponse.ok("Saved", saved));
    }

    @GetMapping("/api/v1/pms/room-types/{id}/inventory")
    public ResponseEntity<ApiResponse<List<RoomTypeInventory>>> listInventory(
            @PathVariable UUID id, @RequestParam String from, @RequestParam String to) {
        return ResponseEntity.ok(ApiResponse.ok(
            inventoryRepo.findByRoomTypeIdAndDateBetween(id, LocalDate.parse(from), LocalDate.parse(to))));
    }
}
