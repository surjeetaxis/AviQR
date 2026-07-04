package in.aviqr.shop.controller;

import in.aviqr.shop.dto.ApiResponse;
import in.aviqr.shop.entity.ShopSettings;
import in.aviqr.shop.repository.ShopSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final ShopSettingsRepository repo;

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
        if (req.getPhonePeMerchantId()        != null) existing.setPhonePeMerchantId(req.getPhonePeMerchantId());
        if (req.getSmtpHost()                 != null) existing.setSmtpHost(req.getSmtpHost());
        if (req.getSmtpUser()                 != null) existing.setSmtpUser(req.getSmtpUser());
        if (req.getSmtpPassword()             != null) existing.setSmtpPassword(req.getSmtpPassword());
        if (req.getTwilioSid()                != null) existing.setTwilioSid(req.getTwilioSid());
        if (req.getTwilioToken()              != null) existing.setTwilioToken(req.getTwilioToken());
        if (req.getWhatsappApiKey()           != null) existing.setWhatsappApiKey(req.getWhatsappApiKey());
        if (req.getFcmServerKey()             != null) existing.setFcmServerKey(req.getFcmServerKey());
        return ResponseEntity.ok(ApiResponse.ok("Settings saved", repo.save(existing)));
    }
}
