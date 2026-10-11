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
        if (promoRepo.findByHotelIdAndCodeIgnoreCase(req.getHotelId(), code).isPresent())
            return ResponseEntity.badRequest().body(ApiResponse.error("This code already exists"));
        PromoCode promo = PromoCode.builder().hotelId(req.getHotelId()).code(code).active(true).usedCount(0).build();
        String problem = apply(promo, req);
        if (problem != null) return ResponseEntity.badRequest().body(ApiResponse.error(problem));
        return ResponseEntity.ok(ApiResponse.ok("Created", promoRepo.save(promo)));
    }

    /** Edits a code's discount, dates and limits; the code itself and its use count stay. */
    @PutMapping("/api/v1/pms/promo-codes/{id}")
    public ResponseEntity<ApiResponse<PromoCode>> update(@PathVariable UUID id, @RequestBody PromoCode req,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        PromoCode promo = promoRepo.findById(id).orElse(null);
        if (promo == null) return ResponseEntity.notFound().build();
        if (!hotelServiceClient.hasAccess(promo.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        String problem = apply(promo, req);
        if (problem != null) return ResponseEntity.badRequest().body(ApiResponse.error(problem));
        return ResponseEntity.ok(ApiResponse.ok("Updated", promoRepo.save(promo)));
    }

    @DeleteMapping("/api/v1/pms/promo-codes/{id}")
    public ResponseEntity<ApiResponse<Boolean>> delete(@PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        PromoCode promo = promoRepo.findById(id).orElse(null);
        if (promo == null) return ResponseEntity.notFound().build();
        if (!hotelServiceClient.hasAccess(promo.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        promoRepo.delete(promo);
        return ResponseEntity.ok(ApiResponse.ok("Deleted", true));
    }

    /** Copies the editable settings onto promo; returns why they're invalid, or null. */
    private String apply(PromoCode promo, PromoCode req) {
        var discount = req.getDiscountPackageId() == null ? null : discountRepo.findById(req.getDiscountPackageId()).orElse(null);
        if (discount == null || !promo.getHotelId().equals(discount.getHotelId())) return "Choose one of this hotel's discount packages";
        if (req.getValidFrom() != null && req.getValidTo() != null && req.getValidTo().isBefore(req.getValidFrom()))
            return "Valid-to must be on or after valid-from";
        if (req.getMaxUses() != null && req.getMaxUses() < 1) return "Maximum uses must be at least 1, or left empty";
        if (req.getMinNights() != null && (req.getMinNights() < 1 || req.getMinNights() > 365)) return "Minimum nights must be between 1 and 365";
        if (req.getMinAmount() != null && req.getMinAmount().signum() < 0) return "Minimum amount can't be negative";
        promo.setDiscountPackageId(discount.getId());
        promo.setValidFrom(req.getValidFrom());
        promo.setValidTo(req.getValidTo());
        promo.setMaxUses(req.getMaxUses());
        promo.setMinNights(req.getMinNights());
        promo.setMinAmount(req.getMinAmount() == null || req.getMinAmount().signum() == 0 ? null : req.getMinAmount());
        return null;
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
