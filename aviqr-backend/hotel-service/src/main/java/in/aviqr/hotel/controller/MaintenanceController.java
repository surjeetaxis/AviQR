package in.aviqr.hotel.controller;

import in.aviqr.hotel.dto.ApiResponse;
import in.aviqr.hotel.entity.MaintenanceTask;
import in.aviqr.hotel.entity.MaintenanceTaskStatus;
import in.aviqr.hotel.entity.RequestPriority;
import in.aviqr.hotel.repository.RoomRepository;
import in.aviqr.hotel.service.HotelAccessService;
import in.aviqr.hotel.service.MaintenanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class MaintenanceController {

    private final MaintenanceService maintenanceService;
    private final RoomRepository roomRepo;
    private final HotelAccessService accessService;

    @GetMapping("/api/v1/maintenance/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<MaintenanceTask>>> list(
            @PathVariable UUID hotelId,
            @RequestParam(required=false) String status,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!accessService.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        MaintenanceTaskStatus s = status != null ? MaintenanceTaskStatus.valueOf(status.toUpperCase()) : null;
        return ResponseEntity.ok(ApiResponse.ok(maintenanceService.list(hotelId, s)));
    }

    @PostMapping("/api/v1/maintenance/tasks")
    public ResponseEntity<ApiResponse<MaintenanceTask>> raise(
            @RequestParam UUID hotelId,
            @RequestParam(required=false) UUID roomId,
            @RequestParam String title,
            @RequestParam(required=false) String notes,
            @RequestParam(required=false, defaultValue="NORMAL") String priority,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (roomId != null) {
            var room = roomRepo.findById(roomId).orElse(null);
            if (room == null || !room.getHotelId().equals(hotelId))
                return ResponseEntity.badRequest().body(ApiResponse.error("Room does not belong to this hotel"));
        }
        if (!accessService.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        MaintenanceTask task = maintenanceService.raise(hotelId, roomId, null, title, notes,
            RequestPriority.valueOf(priority.toUpperCase()), null);
        return ResponseEntity.ok(ApiResponse.ok("Task created", task));
    }

    @PutMapping("/api/v1/maintenance/tasks/{id}/assign")
    public ResponseEntity<ApiResponse<MaintenanceTask>> assign(@PathVariable UUID id, @RequestParam String assignee) {
        return ResponseEntity.ok(ApiResponse.ok("Assigned", maintenanceService.assign(id, assignee)));
    }

    @PutMapping("/api/v1/maintenance/tasks/{id}/start")
    public ResponseEntity<ApiResponse<MaintenanceTask>> start(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok("Started", maintenanceService.start(id)));
    }

    @PutMapping("/api/v1/maintenance/tasks/{id}/complete")
    public ResponseEntity<ApiResponse<MaintenanceTask>> complete(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok("Completed", maintenanceService.complete(id)));
    }
}
