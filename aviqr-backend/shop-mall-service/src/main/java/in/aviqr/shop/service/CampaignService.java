package in.aviqr.shop.service;

import in.aviqr.shop.dto.ApiResponse;
import in.aviqr.shop.dto.CampaignRequest;
import in.aviqr.shop.dto.NearbyCustomerDto;
import in.aviqr.shop.entity.Campaign;
import in.aviqr.shop.entity.CampaignAudienceType;
import in.aviqr.shop.entity.CampaignChannel;
import in.aviqr.shop.entity.CampaignLog;
import in.aviqr.shop.entity.CampaignStatus;
import in.aviqr.shop.entity.Customer;
import in.aviqr.shop.entity.LoyaltyAccount;
import in.aviqr.shop.entity.Shop;
import in.aviqr.shop.entity.ShopPromotion;
import in.aviqr.shop.repository.CampaignLogRepository;
import in.aviqr.shop.repository.CampaignRepository;
import in.aviqr.shop.repository.CustomerRepository;
import in.aviqr.shop.repository.LoyaltyAccountRepository;
import in.aviqr.shop.repository.ShopPromotionRepository;
import in.aviqr.shop.repository.ShopRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.ResolvableType;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.MonthDay;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * MARKET FEATURE: CRM campaigns — birthday/anniversary wishes, segment-targeted
 * broadcasts, and location-prospecting (NEARBY) sends. Audience is resolved from
 * Customer/LoyaltyAccount (shop-mall-service) or, for NEARBY, from auth-service's
 * saved customer addresses within radiusKm of the shop. Delivery goes through
 * notification-report-review-service's TwilioSmsService/ElasticEmailService via
 * plain RestTemplate calls (same cross-service pattern as SellerTierService).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignService {

    private static final String SMS_SEND_URL = "http://notification-report-review-service/api/v1/notifications/sms/send";
    private static final String EMAIL_SEND_URL = "http://notification-report-review-service/api/v1/notifications/email/send";
    private static final String NEARBY_CUSTOMERS_URL = "http://auth-service/api/v1/auth/internal/nearby-customers";

    @Value("${internal.sync.secret:}")
    private String internalSyncSecret;

    private final CampaignRepository campaignRepo;
    private final CampaignLogRepository logRepo;
    private final CustomerRepository customerRepo;
    private final LoyaltyAccountRepository loyaltyRepo;
    private final ShopRepository shopRepo;
    private final ShopPromotionRepository promotionRepo;
    private final RestTemplate restTemplate;

    @Transactional
    public Campaign create(String shopId, CampaignRequest req) {
        CampaignChannel channel = req.getChannel() != null ? req.getChannel() : CampaignChannel.SMS;
        if (channel == CampaignChannel.EMAIL && (req.getSubject() == null || req.getSubject().isBlank()))
            throw new IllegalArgumentException("subject is required for an EMAIL campaign");
        if (req.getAudienceType() == CampaignAudienceType.NEARBY && (req.getRadiusKm() == null || req.getRadiusKm() <= 0))
            throw new IllegalArgumentException("radiusKm is required for a NEARBY audience");

        Campaign campaign = Campaign.builder()
            .shopId(shopId)
            .name(req.getName())
            .messageTemplate(req.getMessageTemplate())
            .audienceType(req.getAudienceType())
            .audienceLabel(req.getAudienceLabel())
            .radiusKm(req.getRadiusKm())
            .channel(channel)
            .subject(req.getSubject())
            .scheduledAt(req.getScheduledAt())
            .status(resolveInitialStatus(req))
            .build();
        return campaignRepo.save(campaign);
    }

    private CampaignStatus resolveInitialStatus(CampaignRequest req) {
        if (req.getAudienceType() == CampaignAudienceType.BIRTHDAY_TODAY
            || req.getAudienceType() == CampaignAudienceType.ANNIVERSARY_TODAY) return CampaignStatus.ACTIVE;
        if (req.getScheduledAt() != null) return CampaignStatus.SCHEDULED;
        return CampaignStatus.DRAFT;
    }

    public List<Campaign> list(String shopId) {
        return campaignRepo.findByShopIdOrderByCreatedAtDesc(shopId);
    }

    public Campaign get(UUID id) {
        return campaignRepo.findById(id).orElseThrow(() -> new RuntimeException("Campaign not found"));
    }

    public List<CampaignLog> getLogs(UUID campaignId) {
        return logRepo.findByCampaignIdOrderBySentAtDesc(campaignId);
    }

    @Transactional
    public Campaign pause(UUID id) {
        Campaign c = get(id);
        c.setStatus(CampaignStatus.PAUSED);
        return campaignRepo.save(c);
    }

    @Transactional
    public Campaign resume(UUID id) {
        Campaign c = get(id);
        c.setStatus(CampaignStatus.ACTIVE);
        return campaignRepo.save(c);
    }

    public void delete(UUID id) {
        campaignRepo.deleteById(id);
    }

    @Transactional
    public Campaign sendNow(UUID id) {
        Campaign campaign = get(id);
        List<Recipient> audience = resolveAudience(campaign);
        dispatch(campaign, audience);
        if (campaign.getAudienceType() != CampaignAudienceType.BIRTHDAY_TODAY
            && campaign.getAudienceType() != CampaignAudienceType.ANNIVERSARY_TODAY) {
            campaign.setStatus(CampaignStatus.SENT);
        }
        return campaignRepo.save(campaign);
    }

    /** One-time campaigns scheduled for a future time — checked every 15 minutes. */
    @Scheduled(cron = "0 */15 * * * *")
    @Transactional
    public void runDueScheduled() {
        List<Campaign> due = campaignRepo.findByStatusAndScheduledAtLessThanEqual(CampaignStatus.SCHEDULED, LocalDateTime.now());
        for (Campaign campaign : due) {
            try {
                List<Recipient> audience = resolveAudience(campaign);
                dispatch(campaign, audience);
                campaign.setStatus(CampaignStatus.SENT);
                campaignRepo.save(campaign);
            } catch (Exception e) {
                log.error("Scheduled campaign {} failed to dispatch: {}", campaign.getId(), e.getMessage());
            }
        }
    }

    /** Recurring birthday/anniversary campaigns — runs daily, dedups per campaign+customer+day. */
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void runRecurring() {
        List<Campaign> recurring = campaignRepo.findByStatusAndAudienceTypeIn(
            CampaignStatus.ACTIVE, List.of(CampaignAudienceType.BIRTHDAY_TODAY, CampaignAudienceType.ANNIVERSARY_TODAY));
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        for (Campaign campaign : recurring) {
            try {
                List<Recipient> audience = resolveAudience(campaign)
                    .stream()
                    .filter(r -> !logRepo.existsByCampaignIdAndCustomerPhoneAndSentAtBetween(campaign.getId(), r.phone(), startOfDay, endOfDay))
                    .toList();
                dispatch(campaign, audience);
                campaign.setLastRunAt(LocalDateTime.now());
                campaignRepo.save(campaign);
            } catch (Exception e) {
                log.error("Recurring campaign {} failed to dispatch: {}", campaign.getId(), e.getMessage());
            }
        }
    }

    private void dispatch(Campaign campaign, List<Recipient> audience) {
        boolean isEmail = campaign.getChannel() == CampaignChannel.EMAIL;
        Shop shop = isEmail ? shopRepo.findById(UUID.fromString(campaign.getShopId())).orElse(null) : null;
        for (Recipient r : audience) {
            String greeting = r.name() != null && !r.name().isBlank() ? r.name() : "there";
            String message = campaign.getMessageTemplate().replace("{name}", greeting);
            boolean sent = false;
            String error = null;
            try {
                if (isEmail) {
                    if (r.email() == null || r.email().isBlank()) throw new IllegalStateException("No email on file");
                    String subject = (campaign.getSubject() != null ? campaign.getSubject() : campaign.getName()).replace("{name}", greeting);
                    sent = Boolean.TRUE.equals(postEmail(r.email(), subject, buildPromotionEmailHtml(shop, message)));
                } else {
                    if (r.phone() == null || r.phone().isBlank()) throw new IllegalStateException("No phone on file");
                    sent = Boolean.TRUE.equals(postSms(r.phone(), message));
                }
            } catch (Exception e) {
                error = e.getMessage();
            }
            logRepo.save(CampaignLog.builder()
                .campaignId(campaign.getId())
                .shopId(campaign.getShopId())
                .customerPhone(r.phone())
                .customerName(r.name())
                .customerEmail(r.email())
                .status(sent ? "SENT" : "FAILED")
                .errorMessage(error)
                .build());
            campaign.setSentCount((campaign.getSentCount() == null ? 0 : campaign.getSentCount()) + (sent ? 1 : 0));
            campaign.setFailedCount((campaign.getFailedCount() == null ? 0 : campaign.getFailedCount()) + (sent ? 0 : 1));
        }
    }

    private Boolean postSms(String phone, String message) {
        Map<String, String> body = Map.of("phone", phone, "message", message);
        HttpHeaders headers = new HttpHeaders();
        if (!internalSyncSecret.isBlank()) headers.set("X-Internal-Secret", internalSyncSecret);
        ParameterizedTypeReference<ApiResponse<Boolean>> ref = ParameterizedTypeReference.forType(
            ResolvableType.forClassWithGenerics(ApiResponse.class, Boolean.class).getType());
        ResponseEntity<ApiResponse<Boolean>> resp = restTemplate.exchange(
            SMS_SEND_URL, HttpMethod.POST, new HttpEntity<>(body, headers), ref);
        return resp.getBody() != null ? resp.getBody().getData() : null;
    }

    private Boolean postEmail(String to, String subject, String htmlBody) {
        Map<String, String> body = Map.of("to", to, "subject", subject, "htmlBody", htmlBody);
        HttpHeaders headers = new HttpHeaders();
        if (!internalSyncSecret.isBlank()) headers.set("X-Internal-Secret", internalSyncSecret);
        ParameterizedTypeReference<ApiResponse<Boolean>> ref = ParameterizedTypeReference.forType(
            ResolvableType.forClassWithGenerics(ApiResponse.class, Boolean.class).getType());
        ResponseEntity<ApiResponse<Boolean>> resp = restTemplate.exchange(
            EMAIL_SEND_URL, HttpMethod.POST, new HttpEntity<>(body, headers), ref);
        return resp.getBody() != null ? resp.getBody().getData() : null;
    }

    /** Wraps a campaign's plain-text message in a branded promotion layout, surfacing the shop's active promo code if it has one. */
    private String buildPromotionEmailHtml(Shop shop, String message) {
        String shopName = shop != null && shop.getName() != null ? shop.getName() : "our store";
        String logo = shop != null && shop.getLogoUrl() != null && !shop.getLogoUrl().isBlank()
            ? "<img src=\"" + shop.getLogoUrl() + "\" alt=\"" + shopName + "\" style=\"max-height:56px;margin-bottom:16px;\"/>"
            : "";
        ShopPromotion promo = shop == null ? null : promotionRepo.findByShopIdAndActiveTrue(shop.getId().toString())
            .stream().findFirst().orElse(null);
        String promoBlock = promo == null ? "" : """
            <div style="margin:20px 0;padding:16px;border:2px dashed #ff6b35;border-radius:8px;text-align:center;">
              <div style="font-size:20px;font-weight:bold;color:#ff6b35;">%s</div>
              <div style="font-size:14px;color:#666;margin-top:4px;">Use code <strong>%s</strong></div>
            </div>
            """.formatted(promo.getLabel(), promo.getCode());
        return """
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#222;">
              %s
              <h2 style="margin:0 0 12px;">%s</h2>
              <p style="line-height:1.5;">%s</p>
              %s
              <p style="font-size:12px;color:#999;margin-top:24px;">You're receiving this because you're near %s.</p>
            </div>
            """.formatted(logo, shopName, message, promoBlock, shopName);
    }

    private List<Recipient> resolveAudience(Campaign campaign) {
        String shopId = campaign.getShopId();
        return switch (campaign.getAudienceType()) {
            case LABEL -> customerRepo.findByShopId(shopId).stream()
                .filter(c -> c.getLabels() != null && c.getLabels().contains(campaign.getAudienceLabel()))
                .map(c -> new Recipient(c.getCustomerPhone(), c.getCustomerName(), c.getEmail()))
                .toList();
            case BIRTHDAY_TODAY -> customerRepo.findByShopId(shopId).stream()
                .filter(c -> c.getBirthday() != null && MonthDay.from(c.getBirthday()).equals(MonthDay.now()))
                .map(c -> new Recipient(c.getCustomerPhone(), c.getCustomerName(), c.getEmail()))
                .toList();
            case ANNIVERSARY_TODAY -> customerRepo.findByShopId(shopId).stream()
                .filter(c -> c.getAnniversary() != null && MonthDay.from(c.getAnniversary()).equals(MonthDay.now()))
                .map(c -> new Recipient(c.getCustomerPhone(), c.getCustomerName(), c.getEmail()))
                .toList();
            case ALL -> allCustomers(shopId);
            case NEARBY -> nearbyCustomers(shopId, campaign.getRadiusKm());
        };
    }

    /** Union of Customer profiles and LoyaltyAccount holders, keyed by phone (a customer may exist in only one). */
    private List<Recipient> allCustomers(String shopId) {
        Map<String, Recipient> byPhone = new LinkedHashMap<>();
        for (LoyaltyAccount a : loyaltyRepo.findByShopIdOrderByTotalPointsDesc(shopId))
            byPhone.put(a.getCustomerPhone(), new Recipient(a.getCustomerPhone(), a.getCustomerName(), null));
        for (Customer c : customerRepo.findByShopId(shopId))
            byPhone.put(c.getCustomerPhone(), new Recipient(c.getCustomerPhone(), c.getCustomerName(), c.getEmail()));
        return List.copyOf(byPhone.values());
    }

    /** Customers whose default saved address (auth-service) is within radiusKm of this shop's own lat/lng. */
    private List<Recipient> nearbyCustomers(String shopId, Double radiusKm) {
        Shop shop = shopRepo.findById(UUID.fromString(shopId)).orElse(null);
        if (shop == null || shop.getLatitude() == null || shop.getLongitude() == null) {
            log.warn("Shop {} has no lat/lng set — NEARBY campaign audience is empty", shopId);
            return List.of();
        }
        double radius = radiusKm != null ? radiusKm : 5.0;
        String url = UriComponentsBuilder.fromHttpUrl(NEARBY_CUSTOMERS_URL)
            .queryParam("lat", shop.getLatitude())
            .queryParam("lng", shop.getLongitude())
            .queryParam("radiusKm", radius)
            .toUriString();
        HttpHeaders headers = new HttpHeaders();
        if (!internalSyncSecret.isBlank()) headers.set("X-Internal-Secret", internalSyncSecret);
        ParameterizedTypeReference<ApiResponse<NearbyCustomerDto[]>> ref = ParameterizedTypeReference.forType(
            ResolvableType.forClassWithGenerics(ApiResponse.class, NearbyCustomerDto[].class).getType());
        try {
            ResponseEntity<ApiResponse<NearbyCustomerDto[]>> resp = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), ref);
            NearbyCustomerDto[] data = resp.getBody() != null ? resp.getBody().getData() : null;
            if (data == null) return List.of();
            return Arrays.stream(data).map(d -> new Recipient(d.getPhone(), d.getName(), d.getEmail())).toList();
        } catch (Exception e) {
            log.error("Failed to fetch nearby customers for shop {}: {}", shopId, e.getMessage());
            return List.of();
        }
    }

    private record Recipient(String phone, String name, String email) {}
}
