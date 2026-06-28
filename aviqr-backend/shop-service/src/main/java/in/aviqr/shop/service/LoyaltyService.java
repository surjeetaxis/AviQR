// ── FILE: shop-service/src/main/java/in/aviqr/shop/service/LoyaltyService.java ──
package in.aviqr.shop.service;

import in.aviqr.shop.entity.LoyaltyAccount;
import in.aviqr.shop.entity.LoyaltyTransaction;
import in.aviqr.shop.entity.LoyaltyTransaction.TransactionType;
import in.aviqr.shop.entity.ShopSettings;
import in.aviqr.shop.repository.LoyaltyAccountRepository;
import in.aviqr.shop.repository.LoyaltyTransactionRepository;
import in.aviqr.shop.repository.ShopSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * MARKET FEATURE: Customer loyalty / repeat-customer stamp program.
 *
 * Business rules (configurable per-shop in ShopSettings):
 *  - loyaltyPointsPerRupee:  default 1 point per ₹10 spent  (stored as 1 point per N rupees)
 *  - loyaltyRedemptionRate:  default 100 points = ₹10 discount
 *  - Minimum points to redeem: 100
 *
 * Flow:
 *  1. Order placed → earnPoints() called with phone + amount
 *  2. Checkout → checkRedeemable() tells frontend how much discount is available
 *  3. Owner can also manually adjust points via API
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LoyaltyService {

    private final LoyaltyAccountRepository     accountRepo;
    private final LoyaltyTransactionRepository txRepo;
    private final ShopSettingsRepository       settingsRepo;

    private static final int DEFAULT_POINTS_PER_RUPEE_DIVISOR = 10; // 1 pt per ₹10
    private static final int DEFAULT_POINTS_PER_RUPEE_UNIT    = 1;
    private static final int DEFAULT_REDEMPTION_RATE          = 100; // 100 pts = ₹10

    /**
     * Called after a successful order.
     * Creates or updates the loyalty account and logs the earn transaction.
     */
    @Transactional
    public LoyaltyAccount earnPoints(String shopId, String customerPhone,
                                     String customerName, BigDecimal orderAmount,
                                     String orderId) {
        ShopSettings settings = settingsRepo.findById(java.util.UUID.fromString(shopId)).orElse(null);
        if (settings == null || !Boolean.TRUE.equals(settings.getLoyaltyEnabled())) {
            log.debug("Loyalty not enabled for shop {}", shopId);
            return null;
        }

        int divisor = settings.getLoyaltyPointsPerRupee() != null
            ? settings.getLoyaltyPointsPerRupee() : DEFAULT_POINTS_PER_RUPEE_DIVISOR;

        int pointsEarned = orderAmount.divide(BigDecimal.valueOf(divisor), 0, RoundingMode.FLOOR)
            .multiply(BigDecimal.valueOf(DEFAULT_POINTS_PER_RUPEE_UNIT)).intValue();

        if (pointsEarned <= 0) return null;

        LoyaltyAccount account = accountRepo
            .findByCustomerPhoneAndShopId(customerPhone, shopId)
            .orElseGet(() -> LoyaltyAccount.builder()
                .customerPhone(customerPhone)
                .customerName(customerName)
                .shopId(shopId)
                .totalSpent(BigDecimal.ZERO)
                .build());

        account.setCustomerName(customerName); // update name in case it changed
        account.setTotalPoints(account.getTotalPoints() + pointsEarned);
        account.setLifetimePoints(account.getLifetimePoints() + pointsEarned);
        account.setTotalOrders(account.getTotalOrders() + 1);
        account.setTotalVisits(account.getTotalVisits() + 1);
        account.setTotalSpent(account.getTotalSpent().add(orderAmount));
        account.setLastVisitAt(LocalDateTime.now());
        LoyaltyAccount saved = accountRepo.save(account);

        // Log transaction
        txRepo.save(LoyaltyTransaction.builder()
            .loyaltyAccountId(saved.getId())
            .shopId(shopId)
            .orderId(orderId)
            .type(TransactionType.EARN)
            .points(pointsEarned)
            .orderAmount(orderAmount)
            .description("Earned " + pointsEarned + " pts for order ₹" + orderAmount)
            .build());

        log.info("Loyalty: +{} pts for {} at shop {} (total: {})", pointsEarned, customerPhone, shopId, saved.getTotalPoints());
        return saved;
    }

    /**
     * Redeems points at checkout.
     * Returns the discount amount applied.
     */
    @Transactional
    public BigDecimal redeemPoints(String shopId, String customerPhone,
                                   int pointsToRedeem, String orderId) {
        ShopSettings settings = settingsRepo.findById(java.util.UUID.fromString(shopId)).orElse(null);
        if (settings == null || !Boolean.TRUE.equals(settings.getLoyaltyEnabled())) {
            throw new RuntimeException("Loyalty not enabled for this shop");
        }

        int redemptionRate = settings.getLoyaltyRedemptionRate() != null
            ? settings.getLoyaltyRedemptionRate() : DEFAULT_REDEMPTION_RATE;

        LoyaltyAccount account = accountRepo.findByCustomerPhoneAndShopId(customerPhone, shopId)
            .orElseThrow(() -> new RuntimeException("No loyalty account found for " + customerPhone));

        if (account.getTotalPoints() < pointsToRedeem) {
            throw new RuntimeException("Insufficient points. Available: " + account.getTotalPoints());
        }
        if (pointsToRedeem < 1) {
            throw new RuntimeException("Minimum redemption is 1 point");
        }

        // Calculate discount: redemptionRate pts = ₹10
        BigDecimal discount = BigDecimal.valueOf(pointsToRedeem)
            .divide(BigDecimal.valueOf(redemptionRate), 2, RoundingMode.FLOOR)
            .multiply(BigDecimal.TEN);

        account.setTotalPoints(account.getTotalPoints() - pointsToRedeem);
        accountRepo.save(account);

        txRepo.save(LoyaltyTransaction.builder()
            .loyaltyAccountId(account.getId())
            .shopId(shopId)
            .orderId(orderId)
            .type(TransactionType.REDEEM)
            .points(-pointsToRedeem)
            .description("Redeemed " + pointsToRedeem + " pts = ₹" + discount + " discount")
            .build());

        log.info("Loyalty: -{} pts redeemed by {} at shop {} (discount ₹{})", pointsToRedeem, customerPhone, shopId, discount);
        return discount;
    }

    /** Check how many points a customer has and what discount is available */
    public Map<String, Object> getBalance(String shopId, String customerPhone) {
        Optional<LoyaltyAccount> acc = accountRepo.findByCustomerPhoneAndShopId(customerPhone, shopId);
        if (acc.isEmpty()) {
            return Map.of("points", 0, "discountValue", 0, "canRedeem", false, "message", "No loyalty account yet");
        }
        LoyaltyAccount a = acc.get();
        int points = a.getTotalPoints();
        boolean canRedeem = points >= 1;
        BigDecimal discountPerHundred = BigDecimal.TEN; // 100 pts = ₹10
        BigDecimal maxDiscount = BigDecimal.valueOf(points)
            .divide(BigDecimal.valueOf(100), 2, RoundingMode.FLOOR)
            .multiply(BigDecimal.TEN);
        return Map.of(
            "points",        points,
            "totalPoints",   points,
            "lifetimePoints",a.getLifetimePoints(),
            "totalOrders",   a.getTotalOrders(),
            "totalSpent",    a.getTotalSpent(),
            "canRedeem",     canRedeem,
            "discountValue", maxDiscount,
            "message",       canRedeem
                ? "You can redeem " + points + " points for ₹" + maxDiscount + " off!"
                : "Start earning loyalty points!"
        );
    }

    /** All loyalty accounts for a shop — for owner CRM dashboard */
    public List<LoyaltyAccount> getShopLoyaltyAccounts(String shopId) {
        return accountRepo.findByShopIdOrderByTotalPointsDesc(shopId);
    }

    /** Transaction history for a customer at a shop */
    public List<LoyaltyTransaction> getHistory(String shopId, String customerPhone) {
        return accountRepo.findByCustomerPhoneAndShopId(customerPhone, shopId)
            .map(acc -> txRepo.findByLoyaltyAccountIdOrderByCreatedAtDesc(acc.getId()))
            .orElse(List.of());
    }
}
