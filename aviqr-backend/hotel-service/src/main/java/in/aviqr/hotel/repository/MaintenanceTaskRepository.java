package in.aviqr.hotel.repository;

import in.aviqr.hotel.entity.MaintenanceTask;
import in.aviqr.hotel.entity.MaintenanceTaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface MaintenanceTaskRepository extends JpaRepository<MaintenanceTask, UUID> {
    List<MaintenanceTask> findByHotelIdOrderByCreatedAtDesc(UUID hotelId);
    List<MaintenanceTask> findByHotelIdAndStatusOrderByCreatedAtDesc(UUID hotelId, MaintenanceTaskStatus status);
}
