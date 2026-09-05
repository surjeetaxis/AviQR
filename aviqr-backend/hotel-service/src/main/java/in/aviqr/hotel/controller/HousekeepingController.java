package in.aviqr.hotel.controller;

import in.aviqr.hotel.dto.ApiResponse;
import in.aviqr.hotel.entity.HousekeepingTask;
import in.aviqr.hotel.entity.HousekeepingTaskStatus;
import in.aviqr.hotel.entity.RequestPriority;
import in.aviqr.hotel.entity.Room;
import in.aviqr.hotel.repository.RoomRepository;
import in.aviqr.hotel.service.HotelAccessService;
import in.aviqr.hotel.service.HousekeepingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class HousekeepingController {

    private final HousekeepingService housekeepingService;
    private final RoomRepository roomRepo;
    private final HotelAccessService accessService;

    @GetMapping("/api/v1/housekeeping/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<HousekeepingTask>>> list(
            @PathVariable UUID hotelId,
            @RequestParam(required=false) String status,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!accessService.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        HousekeepingTaskStatus s = status != null ? HousekeepingTaskStatus.valueOf(status.toUpperCase()) : null;
        return ResponseEntity.ok(ApiResponse.ok(housekeepingService.list(hotelId, s)));
    }

    @PostMapping("/api/v1/housekeeping/tasks")
    public ResponseEntity<ApiResponse<HousekeepingTask>> markDirty(
            @RequestParam UUID roomId,
            @RequestParam(required=false, defaultValue="NORMAL") String priority,
            @RequestParam(required=false) String notes,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Room room = roomRepo.findById(roomId).orElse(null);
        if (room == null) return ResponseEntity.notFound().build();
        if (!accessService.hasAccess(room.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        HousekeepingTask task = housekeepingService.markDirty(room.getHotelId(), roomId, room.getRoomNumber(),
            RequestPriority.valueOf(priority.toUpperCase()), notes);
        return ResponseEntity.ok(ApiResponse.ok("Task created", task));
    }

    @PutMapping("/api/v1/housekeeping/tasks/{id}/assign")
    public ResponseEntity<ApiResponse<HousekeepingTask>> assign(@PathVariable UUID id, @RequestParam String assignee) {
        return ResponseEntity.ok(ApiResponse.ok("Assigned", housekeepingService.assign(id, assignee)));
    }

    @PutMapping("/api/v1/housekeeping/tasks/{id}/start")
    public ResponseEntity<ApiResponse<HousekeepingTask>> start(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok("Started", housekeepingService.start(id)));
    }

    @PutMapping("/api/v1/housekeeping/tasks/{id}/complete")
    public ResponseEntity<ApiResponse<HousekeepingTask>> complete(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok("Completed", housekeepingService.complete(id)));
    }

    @PutMapping("/api/v1/housekeeping/tasks/{id}/inspect")
    public ResponseEntity<ApiResponse<HousekeepingTask>> inspect(@PathVariable UUID id, @RequestParam String inspectedBy) {
        return ResponseEntity.ok(ApiResponse.ok("Inspected", housekeepingService.inspect(id, inspectedBy)));
    }
}
