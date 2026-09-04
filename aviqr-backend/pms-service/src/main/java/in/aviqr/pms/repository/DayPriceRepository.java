package in.aviqr.pms.repository;

import in.aviqr.pms.entity.DayPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DayPriceRepository extends JpaRepository<DayPrice, UUID> {
    List<DayPrice> findByRatePlanIdAndDateBetween(UUID ratePlanId, LocalDate from, LocalDate to);
    Optional<DayPrice> findByRatePlanIdAndDate(UUID ratePlanId, LocalDate date);
}
