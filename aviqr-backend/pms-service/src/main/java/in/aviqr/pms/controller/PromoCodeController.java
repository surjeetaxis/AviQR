package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.PromoCode;
import in.aviqr.pms.repository.DiscountPackageRepository;
import in.aviqr.pms.repository.PromoCodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** Staff management of booking-engine promo codes; each code points at one of the hotel's discount packages. */
@RestController @RequiredArgsConstructor
public class PromoCodeController {

    private final PromoCodeRepository promoRepo;
    private final DiscountPackageRepository discountRepo;
    private final HotelServiceClient hotelServiceClient;

    @GetMapping("/api/v1/pms/promo-codes/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<PromoCode>>> list(@PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(promoRepo.findByHotelIdOrderByCreatedAtDesc(hotelId)));
    }

    @PostMapping("/api/v1/pms/promo-codes")
    public ResponseEntity<ApiResponse<PromoCode>> create(@RequestBody PromoCode req,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (req.getHotelId() == null || !hotelServiceClient.hasAccess(req.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        String code = req.getCode() == null ? "" : req.getCode().trim().toUpperCase(Locale.ROOT);
        if (!code.matches("[A-Z0-9_-]{3,32}"))
            return ResponseEntity.badRequest().body(ApiResponse.error("Codes are 3-32 letters, numbers, - or _"));
        var discount = req.getDiscountPackageId() == null ? null : discountRepo.findById(req.getDiscountPackageId()).orElse(null);
        if (discount == null || !req.getHotelId().equals(discount.getHotelId()))
            return ResponseEntity.badRequest().body(ApiResponse.error("Choose one of this hotel's discount packages"));
        if (req.getValidFrom() != null && req.getValidTo() != null && req.getValidTo().isBefore(req.getValidFrom()))
            return ResponseEntity.badRequest().body(ApiResponse.error("Valid-to must be on or after valid-from"));
        if (promoRepo.findByHotelIdAndCodeIgnoreCase(req.getHotelId(), code).isPresent())
            return ResponseEntity.badRequest().body(ApiResponse.error("This code already exists"));
        PromoCode saved = promoRepo.save(PromoCode.builder().hotelId(req.getHotelId()).code(code)
            .discountPackageId(discount.getId()).validFrom(req.getValidFrom()).validTo(req.getValidTo()).active(true).build());
        return ResponseEntity.ok(ApiResponse.ok("Created", saved));
    }

    @PutMapping("/api/v1/pms/promo-codes/{id}/active")
    public ResponseEntity<ApiResponse<PromoCode>> setActive(@PathVariable UUID id, @RequestParam boolean active,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        PromoCode promo = promoRepo.findById(id).orElse(null);
        if (promo == null) return ResponseEntity.notFound().build();
        if (!hotelServiceClient.hasAccess(promo.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        promo.setActive(active);
        return ResponseEntity.ok(ApiResponse.ok("Updated", promoRepo.save(promo)));
    }
}
