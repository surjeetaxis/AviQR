package in.aviqr.shop.service;

import in.aviqr.shop.dto.TaxResolution;
import in.aviqr.shop.entity.Shop;
import in.aviqr.shop.entity.TaxRule;
import in.aviqr.shop.repository.ShopSettingsRepository;
import in.aviqr.shop.repository.TaxRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class TaxRuleService {

    /** Used only when the shop has no rules and no ShopSettings.taxPercent configured. */
    private static final BigDecimal DEFAULT_TAX_PERCENT = BigDecimal.valueOf(5);

    private final TaxRuleRepository ruleRepo;
    private final ShopSettingsRepository settingsRepo;
    private final ShopService shopService;

    /**
     * Resolves the tax rate to levy for a shop, optionally scoped by service type
     * (outlet/room/order type), menu category, and region. Rules are checked in
     * priority order (lowest first); the first match wins. state/city default to
     * the shop's own registered address when not supplied by the caller, so a
     * region rule applies automatically without every caller needing to know it.
     */
    public TaxResolution resolve(String shopId, String outletType, String category, String state, String city) {
        UUID uuid = safeUuid(shopId);
        String effectiveState = state;
        String effectiveCity = city;
        if ((effectiveState == null || effectiveCity == null) && uuid != null) {
            Shop shop = shopService.findRaw(uuid).orElse(null);
            if (shop != null) {
                if (effectiveState == null) effectiveState = shop.getState();
                if (effectiveCity == null) effectiveCity = shop.getCity();
            }
        }

        List<TaxRule> rules = ruleRepo.findByShopIdAndActiveTrueOrderByPriority(shopId);
        String finalState = effectiveState;
        String finalCity = effectiveCity;
        for (TaxRule rule : rules) {
            boolean matches = switch (rule.getType()) {
                case REGION -> matchesRegion(rule, finalState, finalCity);
                case SERVICE_TYPE -> matches(rule.getOutletType(), outletType);
                case CATEGORY -> matches(rule.getCategory(), category);
                case DEFAULT -> true;
            };
            if (matches) return new TaxResolution(rule.getTaxPercent(), rule.getName(), rule.getId());
        }

        BigDecimal shopDefault = uuid != null
            ? settingsRepo.findById(uuid).map(s -> s.getTaxPercent())
                .filter(p -> p != null && p > 0)
                .map(BigDecimal::valueOf)
                .orElse(null)
            : null;
        if (shopDefault != null) return new TaxResolution(shopDefault, "SHOP_DEFAULT", null);
        return new TaxResolution(DEFAULT_TAX_PERCENT, "PLATFORM_DEFAULT", null);
    }

    private boolean matchesRegion(TaxRule rule, String state, String city) {
        if (rule.getState() == null && rule.getCity() == null) return false;
        if (rule.getState() != null && !matches(rule.getState(), state)) return false;
        return rule.getCity() == null || matches(rule.getCity(), city);
    }

    private boolean matches(String ruleValue, String actual) {
        return ruleValue != null && actual != null && ruleValue.equalsIgnoreCase(actual);
    }

    private UUID safeUuid(String s) {
        try { return UUID.fromString(s); } catch (Exception e) { return null; }
    }
}
