package in.aviqr.pms.dto;

import java.math.BigDecimal;

/** A valid promo code and the discount it gives on the quoted room total. */
public record PublicPromoQuote(String code, String name, String valueType, BigDecimal value, BigDecimal discount) { }
