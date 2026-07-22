package in.aviqr.shop.service;

import in.aviqr.shop.dto.ApiResponse;
import in.aviqr.shop.dto.CampaignRequest;
import in.aviqr.shop.entity.Campaign;
import in.aviqr.shop.entity.CampaignAudienceType;
import in.aviqr.shop.entity.CampaignLog;
import in.aviqr.shop.entity.CampaignStatus;
import in.aviqr.shop.entity.Customer;
import in.aviqr.shop.entity.LoyaltyAccount;
import in.aviqr.shop.repository.CampaignLogRepository;
import in.aviqr.shop.repository.CampaignRepository;
import in.aviqr.shop.repository.CustomerRepository;
import in.aviqr.shop.repository.LoyaltyAccountRepository;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.MonthDay;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * MARKET FEATURE: SMS CRM campaigns — birthday/anniversary wishes and
 * segment-targeted broadcasts. Audience is resolved from Customer/LoyaltyAccount
 * (shop-mall-service); delivery goes through notification-report-review-service's
 * TwilioSmsService via a plain RestTemplate call (same cross-service pattern as
 * SellerTierService).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignService {

    private static final String SMS_SEND_URL = "http://notification-report-review-service/api/v1/notifications/sms/send";

    @Value("${internal.sync.secret:}")
    private String internalSyncSecret;

    private final CampaignRepository campaignRepo;
    private final CampaignLogRepository logRepo;
    private final CustomerRepository customerRepo;
    private final LoyaltyAccountRepository loyaltyRepo;
    private final RestTemplate restTemplate;

    @Transactional
    public Campaign create(String shopId, CampaignRequest req) {
        Campaign campaign = Campaign.builder()
            .shopId(shopId)
            .name(req.getName())
            .messageTemplate(req.getMessageTemplate())
            .audienceType(req.getAudienceType())
            .audienceLabel(req.getAudienceLabel())
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
        List<Recipient> audience = resolveAudience(campaign.getShopId(), campaign.getAudienceType(), campaign.getAudienceLabel());
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
                List<Recipient> audience = resolveAudience(campaign.getShopId(), campaign.getAudienceType(), campaign.getAudienceLabel());
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
                List<Recipient> audience = resolveAudience(campaign.getShopId(), campaign.getAudienceType(), campaign.getAudienceLabel())
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
        for (Recipient r : audience) {
            String message = campaign.getMessageTemplate().replace("{name}", r.name() != null && !r.name().isBlank() ? r.name() : "there");
            boolean sent = false;
            String error = null;
            try {
                sent = Boolean.TRUE.equals(postSms(r.phone(), message));
            } catch (Exception e) {
                error = e.getMessage();
            }
            logRepo.save(CampaignLog.builder()
                .campaignId(campaign.getId())
                .shopId(campaign.getShopId())
                .customerPhone(r.phone())
                .customerName(r.name())
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

    private List<Recipient> resolveAudience(String shopId, CampaignAudienceType type, String label) {
        return switch (type) {
            case LABEL -> customerRepo.findByShopId(shopId).stream()
                .filter(c -> c.getLabels() != null && c.getLabels().contains(label))
                .map(c -> new Recipient(c.getCustomerPhone(), c.getCustomerName()))
                .toList();
            case BIRTHDAY_TODAY -> customerRepo.findByShopId(shopId).stream()
                .filter(c -> c.getBirthday() != null && MonthDay.from(c.getBirthday()).equals(MonthDay.now()))
                .map(c -> new Recipient(c.getCustomerPhone(), c.getCustomerName()))
                .toList();
            case ANNIVERSARY_TODAY -> customerRepo.findByShopId(shopId).stream()
                .filter(c -> c.getAnniversary() != null && MonthDay.from(c.getAnniversary()).equals(MonthDay.now()))
                .map(c -> new Recipient(c.getCustomerPhone(), c.getCustomerName()))
                .toList();
            case ALL -> allCustomers(shopId);
        };
    }

    /** Union of Customer profiles and LoyaltyAccount holders, keyed by phone (a customer may exist in only one). */
    private List<Recipient> allCustomers(String shopId) {
        Map<String, String> byPhone = new LinkedHashMap<>();
        for (LoyaltyAccount a : loyaltyRepo.findByShopIdOrderByTotalPointsDesc(shopId)) byPhone.put(a.getCustomerPhone(), a.getCustomerName());
        for (Customer c : customerRepo.findByShopId(shopId)) byPhone.put(c.getCustomerPhone(), c.getCustomerName());
        return byPhone.entrySet().stream().map(e -> new Recipient(e.getKey(), e.getValue())).toList();
    }

    private record Recipient(String phone, String name) {}
}
