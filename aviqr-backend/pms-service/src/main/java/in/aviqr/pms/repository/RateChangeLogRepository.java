package in.aviqr.pms.repository;

import in.aviqr.pms.entity.RateChangeLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface RateChangeLogRepository extends JpaRepository<RateChangeLog, UUID> {
    Page<RateChangeLog> findByHotelIdOrderByChangedAtDesc(UUID hotelId, Pageable pageable);
    Page<RateChangeLog> findByHotelIdAndRoomTypeIdOrderByChangedAtDesc(UUID hotelId, UUID roomTypeId, Pageable pageable);
    // Category filter (inventory/prices/restrictions) — see RATE_LOG_FIELD_CATEGORY's
    // backend counterpart in RateChangeLogController for the field->category mapping.
    Page<RateChangeLog> findByHotelIdAndFieldInOrderByChangedAtDesc(UUID hotelId, List<String> fields, Pageable pageable);
    Page<RateChangeLog> findByHotelIdAndRoomTypeIdAndFieldInOrderByChangedAtDesc(UUID hotelId, UUID roomTypeId, List<String> fields, Pageable pageable);

    // Channel calendar: price/restriction/allotment edits made after a room type's
    // last successful sync, i.e. dates whose current values haven't reached the
    // channel manager yet.
    List<RateChangeLog> findByHotelIdAndChangedAtAfterAndDateBetween(UUID hotelId, LocalDateTime changedAfter,
                                                                      LocalDate from, LocalDate to);
}
