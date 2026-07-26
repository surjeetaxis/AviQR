package in.aviqr.shop.service;

import in.aviqr.shop.entity.Shop;
import in.aviqr.shop.entity.SubscriptionStatus;
import in.aviqr.shop.repository.ShopRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

// Flips expired trials (TRIALING past trialEndsAt) to TRIAL_EXPIRED and lets
// the owner know via the existing in-app notification pipeline — same
// cross-service RestTemplate pattern CampaignService already uses for SMS,
// avoiding a new RabbitMQ dependency in this service just for this one call.
@Service @RequiredArgsConstructor @Slf4j
public class SubscriptionSchedulerService {

    private static final String NOTIFY_URL = "http://notification-report-review-service/api/v1/notifications/send";

    private final ShopRepository repo;
    private final RestTemplate restTemplate;

    @Scheduled(cron = "0 30 2 * * *") // 2:30 AM daily
    @Transactional
    public void expireTrials() {
        List<Shop> expiring = repo.findBySubscriptionStatusAndTrialEndsAtBefore(
            SubscriptionStatus.TRIALING, LocalDateTime.now());
        for (Shop shop : expiring) {
            shop.setSubscriptionStatus(SubscriptionStatus.TRIAL_EXPIRED);
            repo.save(shop);
            notifyOwner(shop);
        }
        if (!expiring.isEmpty()) log.info("Expired {} shop trial(s)", expiring.size());
    }

    private void notifyOwner(Shop shop) {
        try {
            Map<String, String> body = Map.of(
                "userId", shop.getOwnerId(),
                "title", "Your " + shop.getSubscriptionPlan() + " trial has ended",
                "body", "Your free trial for \"" + shop.getName() + "\" has ended. Contact support to continue on this plan, or you'll be moved back to Starter.",
                "type", "SUBSCRIPTION_TRIAL_EXPIRED",
                "shopId", shop.getId().toString()
            );
            restTemplate.exchange(NOTIFY_URL, HttpMethod.POST, new HttpEntity<>(body), Void.class);
        } catch (Exception e) {
            log.warn("Failed to notify owner of trial expiry for shop {}: {}", shop.getId(), e.getMessage());
        }
    }
}
