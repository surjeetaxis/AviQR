package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.BookingEngineSettings;
import in.aviqr.pms.repository.BookingEngineSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Staff management of the booking engine's hotel policies, cancellation policy and terms. */
@RestController @RequiredArgsConstructor
public class BookingEngineSettingsController {

    private final BookingEngineSettingsRepository settingsRepo;
    private final HotelServiceClient hotelServiceClient;
    private final in.aviqr.pms.service.SecretBox secretBox;

    @GetMapping("/api/v1/pms/booking-engine-settings/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<BookingEngineSettings>> get(@PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(settingsRepo.findByHotelId(hotelId)
            .orElseGet(() -> BookingEngineSettings.builder().hotelId(hotelId).build())));
    }

    @PutMapping("/api/v1/pms/booking-engine-settings/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<BookingEngineSettings>> update(@PathVariable UUID hotelId, @RequestBody BookingEngineSettings req,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        for (String text : new String[]{req.getHotelPolicies(), req.getCancellationPolicy(), req.getTermsAndConditions()})
            if (text != null && text.length() > BookingEngineSettings.MAX_TEXT)
                return ResponseEntity.badRequest().body(ApiResponse.error("Each policy can be up to " + BookingEngineSettings.MAX_TEXT + " characters"));
        BookingEngineSettings settings = settingsRepo.findByHotelId(hotelId)
            .orElseGet(() -> BookingEngineSettings.builder().hotelId(hotelId).build());
        settings.setHotelPolicies(blankToNull(req.getHotelPolicies()));
        settings.setCancellationPolicy(blankToNull(req.getCancellationPolicy()));
        settings.setTermsAndConditions(blankToNull(req.getTermsAndConditions()));
        settings.setRequireTermsAcceptance(!Boolean.FALSE.equals(req.getRequireTermsAcceptance()));
        String mode = req.getPaymentMode() == null ? BookingEngineSettings.PAY_AT_HOTEL : req.getPaymentMode();
        if (!java.util.Set.of(BookingEngineSettings.PAY_AT_HOTEL, BookingEngineSettings.OPTIONAL, BookingEngineSettings.REQUIRED).contains(mode))
            return ResponseEntity.badRequest().body(ApiResponse.error("Unknown payment mode"));
        int percent = req.getDepositPercent() == null ? 100 : req.getDepositPercent();
        if (percent < 1 || percent > 100) return ResponseEntity.badRequest().body(ApiResponse.error("Deposit must be between 1% and 100%"));
        settings.setPaymentMode(mode);
        settings.setDepositPercent(percent);
        String wa = req.getWhatsappNumber() == null ? "" : req.getWhatsappNumber().replaceAll("[^0-9]", "");
        if (!wa.isEmpty() && (wa.length() < 8 || wa.length() > 15)) return ResponseEntity.badRequest().body(ApiResponse.error("Enter the WhatsApp number with its country code"));
        String phoneId = req.getWhatsappPhoneNumberId() == null ? "" : req.getWhatsappPhoneNumberId().trim();
        if (!phoneId.isEmpty() && !phoneId.matches("[0-9]{5,40}")) return ResponseEntity.badRequest().body(ApiResponse.error("The WhatsApp phone number ID is the number Meta shows, digits only"));
        if (!phoneId.isEmpty() && settingsRepo.findByWhatsappPhoneNumberId(phoneId).filter(o -> !o.getHotelId().equals(hotelId)).isPresent())
            return ResponseEntity.badRequest().body(ApiResponse.error("That WhatsApp number is already connected to another hotel"));
        settings.setChatEnabled(Boolean.TRUE.equals(req.getChatEnabled()));
        settings.setWhatsappNumber(wa.isEmpty() ? null : wa);
        settings.setWhatsappPhoneNumberId(phoneId.isEmpty() ? null : phoneId);
        // A blank token keeps the saved one; "-" removes it.
        String token = req.getWhatsappAccessToken() == null ? "" : req.getWhatsappAccessToken().trim();
        if ("-".equals(token)) settings.setWhatsappAccessToken(null);
        else if (!token.isEmpty()) settings.setWhatsappAccessToken(secretBox.seal(token));
        boolean bot = Boolean.TRUE.equals(req.getWhatsappBotEnabled());
        if (bot && (settings.getWhatsappPhoneNumberId() == null || !settings.isWhatsappTokenSet()))
            return ResponseEntity.badRequest().body(ApiResponse.error("The WhatsApp assistant needs the phone number ID and an access token"));
        settings.setWhatsappBotEnabled(bot);
        return ResponseEntity.ok(ApiResponse.ok("Saved", settingsRepo.save(settings)));
    }

    private static String blankToNull(String s) { return s == null || s.isBlank() ? null : s.strip(); }
}
