package in.aviqr.pms.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** A deal as guests see it; discount is filled in only when quoted for a stay. */
public record PublicDeal(UUID id, String name, String description, String valueType, BigDecimal value,
                         LocalDate stayFrom, LocalDate stayTo, Integer minNights, Integer minDaysAhead, Integer maxDaysAhead,
                         BigDecimal discount) { }
