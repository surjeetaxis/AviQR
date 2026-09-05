package in.aviqr.hotel.repository;

import in.aviqr.hotel.entity.HousekeepingTask;
import in.aviqr.hotel.entity.HousekeepingTaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface HousekeepingTaskRepository extends JpaRepository<HousekeepingTask, UUID> {
    List<HousekeepingTask> findByHotelIdOrderByCreatedAtDesc(UUID hotelId);
    List<HousekeepingTask> findByHotelIdAndStatusOrderByCreatedAtDesc(UUID hotelId, HousekeepingTaskStatus status);
    List<HousekeepingTask> findByRoomIdOrderByCreatedAtDesc(UUID roomId);
}
