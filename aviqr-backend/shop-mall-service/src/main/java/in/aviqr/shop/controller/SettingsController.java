package in.aviqr.shop.controller;

import in.aviqr.shop.dto.ApiResponse;
import in.aviqr.shop.entity.ShopSettings;
import in.aviqr.shop.repository.ShopSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final ShopSettingsRepository repo;
    @Value("${internal.sync.secret:}") private String internalSyncSecret;

    @GetMapping("/internal/shop/{shopId}/payment-credentials")
    public ResponseEntity<ApiResponse<Map<String,Object>>> paymentCredentials(
            @PathVariable UUID shopId,
            @RequestHeader(value = "X-Internal-Secret", required = false) String secret) {
        if (!in.aviqr.security.ServiceTrustConfiguration.matches(internalSyncSecret, secret))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        ShopSettings settings = repo.findById(shopId).orElse(null);
        if (settings == null) return ResponseEntity.ok(ApiResponse.ok(Map.of("onlineEnabled", false)));
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
            "onlineEnabled", Boolean.TRUE.equals(settings.getOnlineEnabled()),
            "keyId", settings.getRazorpayKeyId() == null ? "" : settings.getRazorpayKeyId(),
            "keySecret", settings.getRazorpayKeySecret() == null ? "" : settings.getRazorpayKeySecret(),
            "webhookSecret", settings.getRazorpayWebhookSecret() == null ? "" : settings.getRazorpayWebhookSecret())));
    }

    @GetMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<ShopSettings>> get(@PathVariable UUID shopId) {
        ShopSettings settings = repo.findById(shopId).orElseGet(() -> {
            ShopSettings s = new ShopSettings();
            s.setShopId(shopId);
            return s;
        });
        return ResponseEntity.ok(ApiResponse.ok(settings));
    }

    @PutMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<ShopSettings>> update(
            @PathVariable UUID shopId,
            @RequestBody ShopSettings req) {
        ShopSettings existing = repo.findById(shopId).orElseGet(() -> { ShopSettings s = new ShopSettings(); s.setShopId(shopId); return s; });
        if (req.getCashEnabled()              != null) existing.setCashEnabled(req.getCashEnabled());
        if (req.getOnlineEnabled()            != null) existing.setOnlineEnabled(req.getOnlineEnabled());
        if (req.getWalletEnabled()            != null) existing.setWalletEnabled(req.getWalletEnabled());
        if (req.getTaxPercent()               != null) existing.setTaxPercent(req.getTaxPercent());
        if (req.getGstin()                    != null) existing.setGstin(req.getGstin());
        if (req.getBusinessName()             != null) existing.setBusinessName(req.getBusinessName());
        if (req.getLoyaltyEnabled()           != null) existing.setLoyaltyEnabled(req.getLoyaltyEnabled());
        if (req.getLoyaltyPointsPerRupee()    != null) existing.setLoyaltyPointsPerRupee(req.getLoyaltyPointsPerRupee());
        if (req.getLoyaltyRedemptionRate()    != null) existing.setLoyaltyRedemptionRate(req.getLoyaltyRedemptionRate());
        if (req.getRazorpayKeyId()            != null) existing.setRazorpayKeyId(req.getRazorpayKeyId());
        if (req.getRazorpayKeySecret()        != null) existing.setRazorpayKeySecret(req.getRazorpayKeySecret());
        if (req.getRazorpayWebhookSecret()    != null) existing.setRazorpayWebhookSecret(req.getRazorpayWebhookSecret());
        if (req.getPhonePeMerchantId()        != null) existing.setPhonePeMerchantId(req.getPhonePeMerchantId());
        if (req.getSmtpHost()                 != null) existing.setSmtpHost(req.getSmtpHost());
        if (req.getSmtpUser()                 != null) existing.setSmtpUser(req.getSmtpUser());
        if (req.getSmtpPassword()             != null) existing.setSmtpPassword(req.getSmtpPassword());
        if (req.getTwilioSid()                != null) existing.setTwilioSid(req.getTwilioSid());
        if (req.getTwilioToken()              != null) existing.setTwilioToken(req.getTwilioToken());
        if (req.getWhatsappApiKey()           != null) existing.setWhatsappApiKey(req.getWhatsappApiKey());
        if (req.getFcmServerKey()             != null) existing.setFcmServerKey(req.getFcmServerKey());
        if (req.getAutoSettlementEnabled()    != null) existing.setAutoSettlementEnabled(req.getAutoSettlementEnabled());
        if (Boolean.TRUE.equals(req.getOnlineEnabled())) {
            String keyId = req.getRazorpayKeyId() != null ? req.getRazorpayKeyId().trim() : existing.getRazorpayKeyId();
            String keySecret = req.getRazorpayKeySecret() != null && !req.getRazorpayKeySecret().isBlank()
                ? req.getRazorpayKeySecret().trim() : existing.getRazorpayKeySecret();
            String webhookSecret = req.getRazorpayWebhookSecret() != null && !req.getRazorpayWebhookSecret().isBlank()
                ? req.getRazorpayWebhookSecret().trim() : existing.getRazorpayWebhookSecret();
            if (keyId == null || !keyId.matches("rzp_(test|live)_[A-Za-z0-9]+") || keySecret == null || keySecret.length() < 16 || webhookSecret == null || webhookSecret.length() < 32)
                return ResponseEntity.badRequest().body(ApiResponse.error("Enter a valid Razorpay Key ID, Key Secret, and Webhook Secret (at least 32 characters) before enabling online payments"));
        }
        return ResponseEntity.ok(ApiResponse.ok("Settings saved", repo.save(existing)));
    }
}
