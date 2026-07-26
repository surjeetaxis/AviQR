package in.aviqr.payment.service;

import in.aviqr.payment.entity.*;
import in.aviqr.payment.repository.PaymentRepository;
import in.aviqr.payment.repository.SettlementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Nightly auto-settlement: folds each shop's CAPTURED-but-unsettled payments into a
 *  settlement batch for reconciliation/audit purposes. This does not move money — the
 *  payment gateway (Razorpay etc.) handles the actual bank payout on its own schedule —
 *  it closes out AviQR's own books for the day and gives shops an audit trail to check
 *  against their gateway statement. */
@Service @RequiredArgsConstructor @Slf4j
public class SettlementService {

    private final PaymentRepository paymentRepo;
    private final SettlementRepository settlementRepo;
    private final RestTemplate restTemplate;

    // Self-injected proxy reference — settleShop() must be invoked through the Spring proxy
    // (not via a plain `this` call) for its own @Transactional boundary to actually apply,
    // since each shop should commit independently rather than sharing one giant job-wide transaction.
    // Field (not constructor) injection: self-referential constructor injection can't be
    // resolved even with @Lazy and trips Spring's circular-reference guard at startup.
    @Autowired @Lazy private SettlementService self;

    @Value("${settlement.job.enabled:true}")
    private boolean jobEnabled;

    /** Default cutoff is 2 AM — late enough that same-day captures settle the next run,
     *  early enough that shops see the previous day's reconciliation before opening. */
    @Scheduled(cron = "${settlement.cron:0 0 2 * * *}")
    public void runNightlySettlement() {
        if (!jobEnabled) {
            log.info("Nightly settlement job is disabled via settlement.job.enabled");
            return;
        }
        LocalDateTime cutoff = LocalDate.now().atStartOfDay();
        List<String> shopIds = paymentRepo.findShopIdsWithUnsettledPayments(PaymentStatus.CAPTURED, cutoff);
        log.info("Nightly settlement run starting for {} shop(s) with unsettled payments", shopIds.size());
        for (String shopId : shopIds) {
            try {
                self.settleShop(shopId, cutoff, SettlementTriggerType.SCHEDULED, null);
            } catch (Exception e) {
                log.error("Nightly settlement failed for shopId={}: {}", shopId, e.getMessage(), e);
                saveRun(shopId, cutoff, SettlementStatus.FAILED, SettlementTriggerType.SCHEDULED, null,
                    0, BigDecimal.ZERO, "Unexpected error: " + e.getMessage());
            }
        }
    }

    /** Explicit admin/owner-triggered settlement — bypasses the auto-settlement toggle
     *  (an explicit action always overrides an automation preference) and settles
     *  everything captured up to now rather than only up to yesterday's cutoff. */
    public Settlement runManualSettlement(String shopId, String triggeredBy) {
        return self.settleShop(shopId, LocalDateTime.now(), SettlementTriggerType.MANUAL, triggeredBy);
    }

    @Transactional
    public Settlement settleShop(String shopId, LocalDateTime cutoff, SettlementTriggerType triggerType, String triggeredBy) {
        if (triggerType == SettlementTriggerType.SCHEDULED && !isAutoSettlementEnabled(shopId)) {
            return saveRun(shopId, cutoff, SettlementStatus.SKIPPED, triggerType, triggeredBy,
                0, BigDecimal.ZERO, "Auto-settlement disabled for shop");
        }

        List<Payment> unsettled = paymentRepo.findByShopIdAndStatusAndSettlementIdIsNullAndPaidAtBefore(
            shopId, PaymentStatus.CAPTURED, cutoff);
        if (unsettled.isEmpty()) {
            return saveRun(shopId, cutoff, SettlementStatus.SKIPPED, triggerType, triggeredBy,
                0, BigDecimal.ZERO, "No unsettled captured payments in period");
        }

        BigDecimal total = unsettled.stream().map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        LocalDateTime periodStart = unsettled.stream().map(Payment::getPaidAt).min(LocalDateTime::compareTo).orElse(cutoff);

        Settlement settlement = Settlement.builder()
            .shopId(shopId)
            .settlementDate(cutoff.toLocalDate().minusDays(triggerType == SettlementTriggerType.SCHEDULED ? 1 : 0))
            .periodStart(periodStart)
            .periodEnd(cutoff)
            .status(SettlementStatus.COMPLETED)
            .triggerType(triggerType)
            .triggeredBy(triggeredBy)
            .transactionCount(unsettled.size())
            .totalAmount(total)
            .completedAt(LocalDateTime.now())
            .build();
        settlement = settlementRepo.save(settlement);

        UUID settlementId = settlement.getId();
        unsettled.forEach(p -> p.setSettlementId(settlementId));
        paymentRepo.saveAll(unsettled);

        log.info("Settled shopId={} settlementId={} transactions={} total={}",
            shopId, settlementId, unsettled.size(), total);
        return settlement;
    }

    private Settlement saveRun(String shopId, LocalDateTime cutoff, SettlementStatus status,
                                SettlementTriggerType triggerType, String triggeredBy,
                                int count, BigDecimal total, String notes) {
        Settlement run = Settlement.builder()
            .shopId(shopId)
            .settlementDate(cutoff.toLocalDate().minusDays(triggerType == SettlementTriggerType.SCHEDULED ? 1 : 0))
            .periodStart(cutoff).periodEnd(cutoff)
            .status(status).triggerType(triggerType).triggeredBy(triggeredBy)
            .transactionCount(count).totalAmount(total).notes(notes)
            .completedAt(LocalDateTime.now())
            .build();
        return settlementRepo.save(run);
    }

    /** Defaults to enabled (fail-open) when shop-mall-service is unreachable or the shop
     *  hasn't set a preference — matches the market-standard default of auto-settlement
     *  being opt-out, not opt-in. */
    @SuppressWarnings("unchecked")
    private boolean isAutoSettlementEnabled(String shopId) {
        try {
            Map<String, Object> body = restTemplate.getForObject(
                "http://shop-mall-service/api/v1/settings/shop/" + shopId, Map.class);
            Object data = body != null ? body.get("data") : null;
            if (data instanceof Map<?, ?> settings) {
                Object flag = settings.get("autoSettlementEnabled");
                return !(flag instanceof Boolean b) || b;
            }
        } catch (Exception e) {
            log.warn("Could not fetch settlement setting for shopId={}, defaulting to enabled: {}", shopId, e.getMessage());
        }
        return true;
    }
}
