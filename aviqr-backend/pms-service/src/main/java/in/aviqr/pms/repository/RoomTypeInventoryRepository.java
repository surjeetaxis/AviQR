package in.aviqr.pms.repository;

import in.aviqr.pms.entity.RoomTypeInventory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoomTypeInventoryRepository extends JpaRepository<RoomTypeInventory, UUID> {
    Optional<RoomTypeInventory> findByRoomTypeIdAndDate(UUID roomTypeId, LocalDate date);
    List<RoomTypeInventory> findByRoomTypeIdAndDateBetween(UUID roomTypeId, LocalDate from, LocalDate to);
}
