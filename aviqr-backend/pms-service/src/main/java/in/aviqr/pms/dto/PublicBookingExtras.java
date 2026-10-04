package in.aviqr.pms.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** What a guest can add to a direct booking and the hotel-wide taxes/fees that
 *  will be charged on the stay (applied to the folio at check-in). */
public record PublicBookingExtras(List<AddOnOption> addOns, List<TaxLine> taxes) {
    public record AddOnOption(UUID id, String name, String description, BigDecimal price) { }
    /** FIXED is a per-night amount for the reservation; PERCENT is of room revenue. */
    public record TaxLine(String name, String valueType, BigDecimal value) { }
}
