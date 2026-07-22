package in.aviqr.shop.dto;

import java.math.BigDecimal;
import java.util.UUID;

// Result of resolving the applicable tax rate for a shop/service-type/region combination.
// source is the matched TaxRule's name, or "SHOP_DEFAULT" when no rule matched and
// ShopSettings.taxPercent was used instead.
public record TaxResolution(BigDecimal taxPercent, String source, UUID ruleId) {}
