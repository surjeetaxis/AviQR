package in.aviqr.shop.controller;
import in.aviqr.shop.dto.*;
import in.aviqr.shop.entity.Offer;
import in.aviqr.shop.repository.OfferRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController @RequestMapping("/api/v1/offers") @RequiredArgsConstructor
public class OfferController {
    private final OfferRepository repo;

    // Public — offers that are released (active) and within their validity window
    @GetMapping("/public")
    public ResponseEntity<ApiResponse<List<Offer>>> publicActive() {
        LocalDateTime now = LocalDateTime.now();
        List<Offer> live = repo.findByActiveTrue().stream()
            .filter(o -> (o.getStartsAt() == null || !o.getStartsAt().isAfter(now))
                      && (o.getEndsAt() == null || !o.getEndsAt().isBefore(now)))
            .toList();
        return ResponseEntity.ok(ApiResponse.ok(live));
    }

    // Admin — every offer: drafts, released, and expired
    @GetMapping
    public ResponseEntity<ApiResponse<List<Offer>>> adminList(@RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(repo.findAll(Sort.by("createdAt").descending())));
    }

    // Created inactive (draft) — admin must explicitly release it via the /active toggle
    @PostMapping
    public ResponseEntity<ApiResponse<Offer>> create(
            @Valid @RequestBody OfferRequest req,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        Offer offer = Offer.builder()
            .title(req.getTitle()).description(req.getDescription()).code(req.getCode())
            .discountPercent(req.getDiscountPercent())
            .applicablePlans(req.getApplicablePlans() != null && !req.getApplicablePlans().isBlank() ? req.getApplicablePlans() : "ALL")
            .startsAt(req.getStartsAt()).endsAt(req.getEndsAt())
            .active(false)
            .build();
        return ResponseEntity.ok(ApiResponse.ok("Offer created", repo.save(offer)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Offer>> update(
            @PathVariable UUID id, @Valid @RequestBody OfferRequest req,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        Offer offer = repo.findById(id).orElse(null);
        if (offer == null) return ResponseEntity.notFound().build();
        offer.setTitle(req.getTitle());
        offer.setDescription(req.getDescription());
        offer.setCode(req.getCode());
        offer.setDiscountPercent(req.getDiscountPercent());
        if (req.getApplicablePlans() != null && !req.getApplicablePlans().isBlank()) offer.setApplicablePlans(req.getApplicablePlans());
        offer.setStartsAt(req.getStartsAt());
        offer.setEndsAt(req.getEndsAt());
        return ResponseEntity.ok(ApiResponse.ok("Offer updated", repo.save(offer)));
    }

    // Release (publish) or withdraw an offer to/from customer-facing pages
    @PutMapping("/{id}/active")
    public ResponseEntity<ApiResponse<Void>> toggleActive(
            @PathVariable UUID id, @RequestParam boolean active,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        repo.findById(id).ifPresent(o -> { o.setActive(active); repo.save(o); });
        return ResponseEntity.ok(ApiResponse.ok("Updated", null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID id,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        repo.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok("Deleted", null));
    }
}
