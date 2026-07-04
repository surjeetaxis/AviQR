package in.aviqr.menu.service;
import in.aviqr.menu.entity.*;
import in.aviqr.menu.repository.PricingRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j
public class DynamicPricingService {

    private final PricingRuleRepository ruleRepo;

    public BigDecimal getEffectivePrice(String shopId, BigDecimal basePrice) {
        List<PricingRule> rules = ruleRepo.findByShopIdAndActiveTrueOrderByPriority(shopId);
        LocalDateTime now = LocalDateTime.now();
        LocalTime timeNow = now.toLocalTime();
        DayOfWeek dayNow = now.getDayOfWeek();
        LocalDate dateNow = now.toLocalDate();

        for (PricingRule rule : rules) {
            boolean matches = switch (rule.getType()) {
                case TIME -> rule.getFromTime() != null && rule.getToTime() != null
                        && !timeNow.isBefore(rule.getFromTime()) && !timeNow.isAfter(rule.getToTime());
                case DAY  -> rule.getDaysOfWeek() != null
                        && rule.getDaysOfWeek().contains(dayNow.name());
                case DATE -> rule.getFromDate() != null && rule.getToDate() != null
                        && !dateNow.isBefore(rule.getFromDate()) && !dateNow.isAfter(rule.getToDate());
                default   -> false;
            };

            if (matches) {
                return applyAdjustment(basePrice, rule);
            }
        }
        return basePrice;
    }

    private BigDecimal applyAdjustment(BigDecimal price, PricingRule rule) {
        BigDecimal adj = rule.getAdjustmentValue();
        return switch (rule.getAdjustmentType()) {
            case PERCENTAGE_INCREASE -> price.multiply(BigDecimal.ONE.add(adj.divide(BigDecimal.valueOf(100)))).setScale(2, RoundingMode.HALF_UP);
            case PERCENTAGE_DECREASE -> price.multiply(BigDecimal.ONE.subtract(adj.divide(BigDecimal.valueOf(100)))).setScale(2, RoundingMode.HALF_UP);
            case FIXED_INCREASE      -> price.add(adj).setScale(2, RoundingMode.HALF_UP);
            case FIXED_DECREASE      -> price.subtract(adj).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        };
    }
}