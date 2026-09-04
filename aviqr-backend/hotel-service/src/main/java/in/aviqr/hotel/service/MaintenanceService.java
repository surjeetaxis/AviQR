package in.aviqr.hotel.service;

import in.aviqr.hotel.entity.*;
import in.aviqr.hotel.repository.MaintenanceTaskRepository;
import in.aviqr.hotel.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Staff work-order tracking: OPEN → (assign) → IN_PROGRESS → DONE. */
@Service @RequiredArgsConstructor
public class MaintenanceService {

    private final MaintenanceTaskRepository taskRepo;
    private final RoomRepository roomRepo;

    public MaintenanceTask raise(UUID hotelId, UUID roomId, String roomNumber, String title, String notes,
                                  RequestPriority priority, UUID sourceRequestId) {
        if (roomNumber == null && roomId != null) {
            roomNumber = roomRepo.findById(roomId).map(Room::getRoomNumber).orElse(null);
        }
        return taskRepo.save(MaintenanceTask.builder()
            .hotelId(hotelId).roomId(roomId).roomNumber(roomNumber)
            .title(title).notes(notes)
            .status(MaintenanceTaskStatus.OPEN)
            .priority(priority != null ? priority : RequestPriority.NORMAL)
            .sourceRequestId(sourceRequestId)
            .build());
    }

    public List<MaintenanceTask> list(UUID hotelId, MaintenanceTaskStatus status) {
        return status != null
            ? taskRepo.findByHotelIdAndStatusOrderByCreatedAtDesc(hotelId, status)
            : taskRepo.findByHotelIdOrderByCreatedAtDesc(hotelId);
    }

    public MaintenanceTask assign(UUID taskId, String assignee) {
        MaintenanceTask task = get(taskId);
        task.setAssignedTo(assignee);
        return taskRepo.save(task);
    }

    public MaintenanceTask start(UUID taskId) {
        MaintenanceTask task = get(taskId);
        task.setStatus(MaintenanceTaskStatus.IN_PROGRESS);
        task.setStartedAt(LocalDateTime.now());
        return taskRepo.save(task);
    }

    public MaintenanceTask complete(UUID taskId) {
        MaintenanceTask task = get(taskId);
        task.setStatus(MaintenanceTaskStatus.DONE);
        task.setCompletedAt(LocalDateTime.now());
        return taskRepo.save(task);
    }

    private MaintenanceTask get(UUID id) {
        return taskRepo.findById(id).orElseThrow(() -> new RuntimeException("Maintenance task not found: " + id));
    }
}
