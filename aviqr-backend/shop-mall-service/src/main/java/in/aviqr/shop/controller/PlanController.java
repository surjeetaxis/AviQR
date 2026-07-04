package in.aviqr.shop.controller;
import in.aviqr.shop.dto.*;
import in.aviqr.shop.entity.*;
import in.aviqr.shop.repository.PlanRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController @RequestMapping("/api/v1/plans") @RequiredArgsConstructor
public class PlanController {
    private final PlanRepository repo;

    // Public — active plans for the pricing/signup/settings pages, optionally by vertical
    @GetMapping("/public")
    public ResponseEntity<ApiResponse<List<Plan>>> publicList(@RequestParam(required=false) String vertical) {
        List<Plan> plans = vertical != null
            ? repo.findByVerticalAndActiveTrueOrderBySortOrderAsc(PlanVertical.valueOf(vertical.toUpperCase()))
            : repo.findByActiveTrueOrderBySortOrderAsc();
        return ResponseEntity.ok(ApiResponse.ok(plans));
    }

    // Admin — every plan, including inactive/hidden ones
    // ADMIN can manage plans; SUPPORT gets read-only visibility (billing tab)
    @GetMapping
    public ResponseEntity<ApiResponse<List<Plan>>> adminList(@RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!"ADMIN".equals(role) && !"SUPPORT".equals(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(repo.findAll(Sort.by("vertical").and(Sort.by("sortOrder")))));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Plan>> create(
            @Valid @RequestBody PlanRequest req,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        String key = req.getPlanKey().toUpperCase();
        if (repo.existsByPlanKey(key))
            return ResponseEntity.badRequest().body(ApiResponse.error("A plan with this key already exists"));
        Plan plan = Plan.builder()
            .planKey(key)
            .label(req.getLabel())
            .vertical(req.getVertical() != null ? PlanVertical.valueOf(req.getVertical().toUpperCase()) : PlanVertical.SHOP)
            .price(req.getPrice())
            .features(req.getFeatures())
            .sortOrder(req.getSortOrder() != null ? req.getSortOrder() : 0)
            .build();
        return ResponseEntity.ok(ApiResponse.ok("Plan created", repo.save(plan)));
    }

    // planKey is immutable — everything else (price, label, features, vertical, order) is editable
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Plan>> update(
            @PathVariable UUID id, @Valid @RequestBody PlanRequest req,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        Plan plan = repo.findById(id).orElse(null);
        if (plan == null) return ResponseEntity.notFound().build();
        plan.setLabel(req.getLabel());
        plan.setPrice(req.getPrice());
        if (req.getVertical() != null) plan.setVertical(PlanVertical.valueOf(req.getVertical().toUpperCase()));
        if (req.getFeatures() != null) plan.setFeatures(req.getFeatures());
        if (req.getSortOrder() != null) plan.setSortOrder(req.getSortOrder());
        return ResponseEntity.ok(ApiResponse.ok("Plan updated", repo.save(plan)));
    }

    // Hide/show a plan on customer-facing pages without deleting historical shop assignments
    @PutMapping("/{id}/active")
    public ResponseEntity<ApiResponse<Void>> toggleActive(
            @PathVariable UUID id, @RequestParam boolean active,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        repo.findById(id).ifPresent(p -> { p.setActive(active); repo.save(p); });
        return ResponseEntity.ok(ApiResponse.ok("Updated", null));
    }
}
