package in.aviqr.shop.service;

import in.aviqr.shop.dto.ApiResponse;
import in.aviqr.shop.dto.RatingSummaryResponse;
import in.aviqr.shop.dto.ShopOrderStatsResponse;
import in.aviqr.shop.entity.SellerTier;
import in.aviqr.shop.entity.Shop;
import in.aviqr.shop.repository.ShopRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.ResolvableType;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

/**
 * Nightly Seller Tier recalculation. Pulls completion rate + revenue from
 * order-service and rating + count from review-service, then assigns a
 * GOLD/SILVER/BRONZE/NEW tier per shop. returnPercentage/satisfactionScore
 * have no live data source yet, so they stay as seeded/admin-set values.
 */
@Service @RequiredArgsConstructor @Slf4j
public class SellerTierService {
    private final ShopRepository repo;
    private final RestTemplate restTemplate;

    @Scheduled(cron = "0 0 2 * * *") // 2 AM daily
    public void recalculateAllTiers() {
        log.info("Seller Tier recalculation starting for {} shops", repo.count());
        repo.findAll().forEach(this::recalculateTier);
        log.info("Seller Tier recalculation complete");
    }

    @Transactional
    public void recalculateTier(Shop shop) {
        try {
            ShopOrderStatsResponse stats = fetch("http://order-qr-service/api/v1/orders/shop/" + shop.getId() + "/stats",
                ShopOrderStatsResponse.class);
            RatingSummaryResponse rating = fetch("http://notification-report-review-service/api/v1/reviews/public/shop/" + shop.getId() + "/summary",
                RatingSummaryResponse.class);

            long totalOrders = 0;
            if (stats != null) {
                shop.setCompletionRate(stats.getCompletionRate());
                shop.setSalesVolume(stats.getTotalRevenue());
                totalOrders = stats.getCompletedCount() + stats.getCancelledCount() + stats.getRejectedCount();
            }
            if (rating != null && rating.getRatingCount() != null) {
                shop.setRating(rating.getAverageRating());
                shop.setRatingCount(rating.getRatingCount().intValue());
            }

            shop.setTier(computeTier(shop, totalOrders));
            shop.setTierUpdatedAt(LocalDateTime.now());
            repo.save(shop);
        } catch (Exception e) {
            log.warn("Tier recalculation failed for shop {}: {}", shop.getId(), e.getMessage());
        }
    }

    private SellerTier computeTier(Shop shop, long totalOrders) {
        BigDecimal rating = nz(shop.getRating());
        BigDecimal completionRate = nz(shop.getCompletionRate());
        BigDecimal satisfaction = nz(shop.getSatisfactionScore());

        // Weighted score out of 100: rating 40%, completion rate 35%, satisfaction 25%
        BigDecimal score = rating.multiply(BigDecimal.valueOf(20)) // rating is /5 -> *20 = /100
            .multiply(BigDecimal.valueOf(0.40))
            .add(completionRate.multiply(BigDecimal.valueOf(0.35)))
            .add(satisfaction.multiply(BigDecimal.valueOf(0.25)))
            .setScale(2, RoundingMode.HALF_UP);

        if (totalOrders < 5) return SellerTier.NEW;
        if (score.compareTo(BigDecimal.valueOf(80)) >= 0) return SellerTier.GOLD;
        if (score.compareTo(BigDecimal.valueOf(60)) >= 0) return SellerTier.SILVER;
        return SellerTier.BRONZE;
    }

    private BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }

    private <T> T fetch(String url, Class<T> type) {
        ParameterizedTypeReference<ApiResponse<T>> ref = ParameterizedTypeReference.forType(
            ResolvableType.forClassWithGenerics(ApiResponse.class, type).getType());
        ResponseEntity<ApiResponse<T>> resp = restTemplate.exchange(url, HttpMethod.GET, null, ref);
        return resp.getBody() != null ? resp.getBody().getData() : null;
    }
}
