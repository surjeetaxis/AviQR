package in.aviqr.pms.service;

import in.aviqr.pms.entity.RateChangeLog;
import in.aviqr.pms.repository.RateChangeLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class RateChangeLogService {

    private final RateChangeLogRepository repo;

    /** Logs one row only if oldValue and newValue actually differ — a save that didn't
     *  change this particular field (e.g. price sent again unchanged while only
     *  minStay was actually edited) shouldn't produce log noise. */
    public void logIfChanged(UUID hotelId, UUID roomTypeId, UUID ratePlanId, LocalDate date,
                              String field, Object oldValue, Object newValue, String changedBy) {
        if (Objects.equals(oldValue, newValue)) return;
        repo.save(RateChangeLog.builder()
            .hotelId(hotelId).roomTypeId(roomTypeId).ratePlanId(ratePlanId).date(date)
            .field(field)
            .oldValue(oldValue == null ? null : oldValue.toString())
            .newValue(newValue == null ? null : newValue.toString())
            .changedBy(changedBy)
            .build());
    }
}
