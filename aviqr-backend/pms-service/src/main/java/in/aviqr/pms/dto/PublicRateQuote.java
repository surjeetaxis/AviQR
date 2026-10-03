package in.aviqr.pms.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record PublicRateQuote(UUID roomTypeId, UUID ratePlanId, long nights,
                              BigDecimal totalBeforeTax, String currency) { }
