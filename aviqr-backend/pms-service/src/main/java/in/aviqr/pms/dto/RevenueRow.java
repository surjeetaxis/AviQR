package in.aviqr.pms.dto;

import java.math.BigDecimal;

/** A single (label, amount) row shared by the revenue-by-X breakdown reports —
 *  Spring Data projects a JPQL "select x as label, sum(y) as amount" straight
 *  into this interface, no manual mapping needed. */
public interface RevenueRow {
    String getLabel();
    BigDecimal getAmount();
}
