package in.aviqr.hotel.service;

import in.aviqr.hotel.entity.*;
import in.aviqr.hotel.repository.HousekeepingTaskRepository;
import in.aviqr.hotel.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Room-turnover cleaning workflow: DIRTY → (assign) → IN_PROGRESS → DONE (=CLEAN) →
 *  INSPECTED. Independent of Room.status (occupancy) — see Room.housekeepingStatus. */
@Service @RequiredArgsConstructor
public class HousekeepingService {

    private final HousekeepingTaskRepository taskRepo;
    private final RoomRepository roomRepo;

    /** Called when a room turns VACANT via checkout — see HotelController#updateRoomOccupancy. */
    public void createTaskForCheckout(UUID hotelId, UUID roomId, String roomNumber) {
        roomRepo.findById(roomId).ifPresent(r -> {
            r.setHousekeepingStatus(HousekeepingStatus.DIRTY);
            roomRepo.save(r);
        });
        taskRepo.save(HousekeepingTask.builder()
            .hotelId(hotelId).roomId(roomId).roomNumber(roomNumber)
            .status(HousekeepingTaskStatus.PENDING).priority(RequestPriority.NORMAL)
            .build());
    }

    /** Manual flag (spill, guest complaint, pre-arrival re-clean) — not tied to a checkout. */
    public HousekeepingTask markDirty(UUID hotelId, UUID roomId, String roomNumber, RequestPriority priority, String notes) {
        roomRepo.findById(roomId).ifPresent(r -> {
            r.setHousekeepingStatus(HousekeepingStatus.DIRTY);
            roomRepo.save(r);
        });
        return taskRepo.save(HousekeepingTask.builder()
            .hotelId(hotelId).roomId(roomId).roomNumber(roomNumber)
            .status(HousekeepingTaskStatus.PENDING).priority(priority != null ? priority : RequestPriority.NORMAL)
            .notes(notes).build());
    }

    public List<HousekeepingTask> list(UUID hotelId, HousekeepingTaskStatus status) {
        return status != null
            ? taskRepo.findByHotelIdAndStatusOrderByCreatedAtDesc(hotelId, status)
            : taskRepo.findByHotelIdOrderByCreatedAtDesc(hotelId);
    }

    public HousekeepingTask assign(UUID taskId, String assignee) {
        HousekeepingTask task = get(taskId);
        task.setAssignedTo(assignee);
        return taskRepo.save(task);
    }

    public HousekeepingTask start(UUID taskId) {
        HousekeepingTask task = get(taskId);
        task.setStatus(HousekeepingTaskStatus.IN_PROGRESS);
        task.setStartedAt(LocalDateTime.now());
        return taskRepo.save(task);
    }

    public HousekeepingTask complete(UUID taskId) {
        HousekeepingTask task = get(taskId);
        task.setStatus(HousekeepingTaskStatus.DONE);
        task.setCompletedAt(LocalDateTime.now());
        roomRepo.findById(task.getRoomId()).ifPresent(r -> {
            r.setHousekeepingStatus(HousekeepingStatus.CLEAN);
            roomRepo.save(r);
        });
        return taskRepo.save(task);
    }

    public HousekeepingTask inspect(UUID taskId, String inspectedBy) {
        HousekeepingTask task = get(taskId);
        if (task.getStatus() != HousekeepingTaskStatus.DONE)
            throw new RuntimeException("Only a DONE task can be inspected");
        task.setStatus(HousekeepingTaskStatus.INSPECTED);
        task.setInspectedAt(LocalDateTime.now());
        task.setInspectedBy(inspectedBy);
        roomRepo.findById(task.getRoomId()).ifPresent(r -> {
            r.setHousekeepingStatus(HousekeepingStatus.INSPECTED);
            roomRepo.save(r);
        });
        return taskRepo.save(task);
    }

    private HousekeepingTask get(UUID id) {
        return taskRepo.findById(id).orElseThrow(() -> new RuntimeException("Housekeeping task not found: " + id));
    }
}
