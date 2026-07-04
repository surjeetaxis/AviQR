package in.aviqr.menu.service;

import in.aviqr.menu.dto.*;
import in.aviqr.menu.entity.MenuItem;
import in.aviqr.menu.repository.MenuItemRepository;
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

/**
 * Nightly Product Ranking recalculation. rankingScore (out of 100) blends:
 * product rating (30%), seller rating + tier (20%), sales volume (25%),
 * conversion rate (15%), SEO score (10%). seoScore/conversionRate have no
 * live data source yet, so they stay as seeded/admin-set values.
 */
@Service @RequiredArgsConstructor @Slf4j
public class ProductRankingService {
    private final MenuItemRepository repo;
    private final RestTemplate restTemplate;

    @Scheduled(cron = "0 30 2 * * *") // 2:30 AM daily, after Seller Tier job
    public void recalculateAllRankings() {
        log.info("Product Ranking recalculation starting for {} items", repo.count());
        repo.findAll().forEach(this::recalculateRanking);
        log.info("Product Ranking recalculation complete");
    }

    @Transactional
    public void recalculateRanking(MenuItem item) {
        try {
            ItemOrderStatsResponse stats = fetch(
                "http://order-qr-service/api/v1/orders/item/" + item.getId() + "/stats", ItemOrderStatsResponse.class);
            RatingSummaryResponse rating = fetch(
                "http://notification-report-review-service/api/v1/reviews/public/product/" + item.getId() + "/summary", RatingSummaryResponse.class);
            ShopTierResponse seller = fetch(
                "http://shop-mall-service/api/v1/shops/" + item.getShopId(), ShopTierResponse.class);

            if (stats != null) item.setSalesVolume((int) stats.getTotalQuantity());
            if (rating != null && rating.getRatingCount() != null) {
                item.setRating(rating.getAverageRating());
                item.setRatingCount(rating.getRatingCount().intValue());
            }

            item.setRankingScore(computeScore(item, seller));
            repo.save(item);
        } catch (Exception e) {
            log.warn("Ranking recalculation failed for item {}: {}", item.getId(), e.getMessage());
        }
    }

    private BigDecimal computeScore(MenuItem item, ShopTierResponse seller) {
        BigDecimal rating = nz(item.getRating());            // 0-5
        BigDecimal seoScore = nz(item.getSeoScore());          // 0-100
        BigDecimal conversionRate = nz(item.getConversionRate()); // 0-100
        BigDecimal salesVolume = BigDecimal.valueOf(item.getSalesVolume() == null ? 0 : item.getSalesVolume());
        BigDecimal sellerRating = seller != null ? nz(seller.getRating()) : BigDecimal.ZERO;
        BigDecimal tierBonus = seller != null ? tierBonus(seller.getTier()) : BigDecimal.ZERO;

        BigDecimal salesScore = salesVolume.compareTo(BigDecimal.valueOf(1000)) > 0
            ? BigDecimal.valueOf(100) : salesVolume.divide(BigDecimal.TEN, 2, RoundingMode.HALF_UP);

        return rating.multiply(BigDecimal.valueOf(20)).multiply(BigDecimal.valueOf(0.30))      // /5 -> /100, 30%
            .add(sellerRating.multiply(BigDecimal.valueOf(20)).multiply(BigDecimal.valueOf(0.15)).add(tierBonus)) // 20%
            .add(salesScore.multiply(BigDecimal.valueOf(0.25)))                                  // 25%
            .add(conversionRate.multiply(BigDecimal.valueOf(0.15)))                              // 15%
            .add(seoScore.multiply(BigDecimal.valueOf(0.10)))                                    // 10%
            .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal tierBonus(String tier) {
        if (tier == null) return BigDecimal.ZERO;
        return switch (tier) {
            case "GOLD" -> BigDecimal.valueOf(5);
            case "SILVER" -> BigDecimal.valueOf(3);
            case "BRONZE" -> BigDecimal.valueOf(1);
            default -> BigDecimal.ZERO;
        };
    }

    private BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }

    private <T> T fetch(String url, Class<T> type) {
        ParameterizedTypeReference<ApiResponse<T>> ref = ParameterizedTypeReference.forType(
            ResolvableType.forClassWithGenerics(ApiResponse.class, type).getType());
        ResponseEntity<ApiResponse<T>> resp = restTemplate.exchange(url, HttpMethod.GET, null, ref);
        return resp.getBody() != null ? resp.getBody().getData() : null;
    }
}
