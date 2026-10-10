package in.aviqr.pms.repository;

import in.aviqr.pms.entity.BookingEngineSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BookingEngineSettingsRepository extends JpaRepository<BookingEngineSettings, UUID> {
    Optional<BookingEngineSettings> findByHotelId(UUID hotelId);
}
