package in.aviqr.menu.controller;
import in.aviqr.menu.dto.*;
import in.aviqr.menu.entity.*;
import in.aviqr.menu.repository.*;
import in.aviqr.menu.service.DynamicPricingService;
import in.aviqr.menu.service.ProductRankingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.*;

@RestController @RequiredArgsConstructor
public class MenuController {
    private final CategoryRepository catRepo;
    private final MenuItemRepository itemRepo;
    private final PricingRuleRepository ruleRepo;
    private final ProductRankingService rankingService;
    private final DynamicPricingService pricingService;

    // ── Public endpoint — called by customer QR scan ──────────────────────────
    @GetMapping("/api/v1/menu/public/{shopId}")
    public ResponseEntity<ApiResponse<MenuResponse>> getPublicMenu(
            @PathVariable String shopId,
            @RequestParam(defaultValue="en") String lang,
            @RequestParam(required=false) String cat) {

        List<Category> categories = catRepo.findByShopIdAndActiveTrueOrderBySortOrder(shopId);
        List<MenuResponse.CategoryDto> catDtos = new ArrayList<>();

        for (Category c : categories) {
            if (cat != null && !c.getId().toString().equals(cat)) continue;
            List<MenuItem> items = itemRepo.findByCategoryIdAndAvailableTrue(c.getId());

            List<MenuResponse.ItemDto> itemDtos = items.stream().map(item -> {
                MenuResponse.ItemDto dto = new MenuResponse.ItemDto();
                dto.setId(item.getId());
                dto.setName(getLangName(item, lang));
                dto.setDescription(getLangDesc(item, lang));
                dto.setPrice(item.getPrice());
                dto.setEffectivePrice(pricingService.getEffectivePrice(shopId, item.getPrice()));
                dto.setImageUrl(item.getImageUrl());
                dto.setVeg(item.getVeg()); dto.setSpicy(item.getSpicy());
                dto.setPopular(item.getPopular()); dto.setAvailable(item.getAvailable());
                dto.setTag(item.getTag());
                dto.setRating(item.getRating()); dto.setRatingCount(item.getRatingCount());
                return dto;
            }).toList();

            MenuResponse.CategoryDto cd = new MenuResponse.CategoryDto();
            cd.setId(c.getId());
            cd.setName(getLangCatName(c, lang));
            cd.setEmoji(c.getEmoji());
            cd.setItems(itemDtos);
            catDtos.add(cd);
        }

        MenuResponse resp = new MenuResponse();
        resp.setShopId(shopId); resp.setLang(lang); resp.setCategories(catDtos);
        return ResponseEntity.ok(ApiResponse.ok(resp));
    }

    // Roles allowed to manage a shop's menu, provided their X-Shop-Id matches the resource.
    private static final Set<String> MENU_MANAGER_ROLES = Set.of("OWNER", "MANAGER", "MENU_EDITOR");

    private boolean canManageShop(String role, String callerShopId, String resourceShopId) {
        if ("ADMIN".equals(role)) return true;
        return resourceShopId != null && resourceShopId.equals(callerShopId) && MENU_MANAGER_ROLES.contains(role);
    }

    private ResponseEntity<ApiResponse<Void>> forbidden() {
        return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
    }

    // ── Category CRUD ─────────────────────────────────────────────────────────
    @GetMapping("/api/v1/categories/shop/{shopId}")
    public ResponseEntity<ApiResponse<List<Category>>> getCategories(@PathVariable String shopId) {
        return ResponseEntity.ok(ApiResponse.ok(catRepo.findByShopIdAndActiveTrueOrderBySortOrder(shopId)));
    }

    @PostMapping("/api/v1/categories")
    public ResponseEntity<?> createCategory(@RequestBody Category cat,
                                             @RequestHeader("X-User-Role") String role,
                                             @RequestHeader(value="X-Shop-Id", required=false) String callerShopId) {
        if (!canManageShop(role, callerShopId, cat.getShopId())) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok("Created", catRepo.save(cat)));
    }

    @PutMapping("/api/v1/categories/{id}")
    public ResponseEntity<?> updateCategory(@PathVariable UUID id, @RequestBody Category req,
                                             @RequestHeader("X-User-Role") String role,
                                             @RequestHeader(value="X-Shop-Id", required=false) String callerShopId) {
        return catRepo.findById(id).<ResponseEntity<?>>map(c -> {
            if (!canManageShop(role, callerShopId, c.getShopId())) return forbidden();
            c.setName(req.getName()); c.setEmoji(req.getEmoji()); c.setSortOrder(req.getSortOrder());
            return ResponseEntity.ok(ApiResponse.ok("Updated", catRepo.save(c)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/api/v1/categories/{id}")
    public ResponseEntity<?> deleteCategory(@PathVariable UUID id,
                                             @RequestHeader("X-User-Role") String role,
                                             @RequestHeader(value="X-Shop-Id", required=false) String callerShopId) {
        return catRepo.findById(id).<ResponseEntity<?>>map(c -> {
            if (!canManageShop(role, callerShopId, c.getShopId())) return forbidden();
            c.setActive(false); catRepo.save(c);
            return ResponseEntity.ok(ApiResponse.ok("Deleted", null));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Item CRUD ─────────────────────────────────────────────────────────────
    // Unpaginated — used by storefront/owner views that always need the full list.
    @GetMapping("/api/v1/items/shop/{shopId}/all")
    public ResponseEntity<ApiResponse<List<MenuItem>>> getAllItems(@PathVariable String shopId) {
        return ResponseEntity.ok(ApiResponse.ok(itemRepo.findByShopIdOrderBySortOrder(shopId)));
    }

    // Paginated — Product Ranking: defaults to ranking_score desc so higher-ranked
    // products surface first; pass sort=recent for createdAt-desc instead.
    @GetMapping("/api/v1/items/shop/{shopId}")
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<MenuItem>>> getItems(
            @PathVariable String shopId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort) {
        int clampedSize = switch (size) { case 10, 20, 50, 100 -> size; default -> 20; };
        org.springframework.data.domain.Sort s = "recent".equalsIgnoreCase(sort)
            ? org.springframework.data.domain.Sort.by("createdAt").descending()
            : org.springframework.data.domain.Sort.by("rankingScore").descending();
        var pageable = org.springframework.data.domain.PageRequest.of(page, clampedSize, s);
        var result = (search != null && !search.isBlank())
            ? itemRepo.searchByShopId(shopId, search, pageable)
            : itemRepo.findByShopId(shopId, pageable);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/api/v1/items")
    public ResponseEntity<?> createItem(@RequestBody MenuItem item,
                                         @RequestHeader("X-User-Role") String role,
                                         @RequestHeader(value="X-Shop-Id", required=false) String callerShopId) {
        if (!canManageShop(role, callerShopId, item.getShopId())) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok("Created", itemRepo.save(item)));
    }

    @PutMapping("/api/v1/items/{id}")
    public ResponseEntity<?> updateItem(@PathVariable UUID id, @RequestBody MenuItem req,
                                         @RequestHeader("X-User-Role") String role,
                                         @RequestHeader(value="X-Shop-Id", required=false) String callerShopId) {
        return itemRepo.findById(id).<ResponseEntity<?>>map(item -> {
            if (!canManageShop(role, callerShopId, item.getShopId())) return forbidden();
            item.setName(req.getName()); item.setPrice(req.getPrice());
            item.setDescription(req.getDescription()); item.setImageUrl(req.getImageUrl());
            item.setVeg(req.getVeg()); item.setSpicy(req.getSpicy());
            item.setPopular(req.getPopular()); item.setTag(req.getTag());
            return ResponseEntity.ok(ApiResponse.ok("Updated", itemRepo.save(item)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/api/v1/items/{id}/availability")
    public ResponseEntity<?> toggleAvailability(@PathVariable UUID id, @RequestParam boolean available,
                                                 @RequestHeader("X-User-Role") String role,
                                                 @RequestHeader(value="X-Shop-Id", required=false) String callerShopId) {
        return itemRepo.findById(id).<ResponseEntity<?>>map(i -> {
            if (!canManageShop(role, callerShopId, i.getShopId())) return forbidden();
            i.setAvailable(available); itemRepo.save(i);
            return ResponseEntity.ok(ApiResponse.ok("Updated", null));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/api/v1/items/{id}")
    public ResponseEntity<?> deleteItem(@PathVariable UUID id,
                                         @RequestHeader("X-User-Role") String role,
                                         @RequestHeader(value="X-Shop-Id", required=false) String callerShopId) {
        return itemRepo.findById(id).<ResponseEntity<?>>map(i -> {
            if (!canManageShop(role, callerShopId, i.getShopId())) return forbidden();
            itemRepo.deleteById(id);
            return ResponseEntity.ok(ApiResponse.ok("Deleted", null));
        }).orElse(ResponseEntity.notFound().build());
    }

    // Admin/ops trigger — normally runs nightly via @Scheduled, exposed here
    // so rankings can be recalculated on demand without waiting for the cron.
    @PostMapping("/api/v1/items/admin/recalculate-rankings")
    public ResponseEntity<?> recalculateRankings(@RequestHeader("X-User-Role") String role) {
        if (!"ADMIN".equals(role)) return forbidden();
        rankingService.recalculateAllRankings();
        return ResponseEntity.ok(ApiResponse.ok("Ranking recalculation triggered", null));
    }

    // ── Pricing Rules ─────────────────────────────────────────────────────────
    @GetMapping("/api/v1/pricing-rules/shop/{shopId}")
    public ResponseEntity<ApiResponse<List<PricingRule>>> getRules(@PathVariable String shopId) {
        return ResponseEntity.ok(ApiResponse.ok(ruleRepo.findByShopIdAndActiveTrueOrderByPriority(shopId)));
    }

    @PostMapping("/api/v1/pricing-rules")
    public ResponseEntity<?> createRule(@RequestBody PricingRule rule,
                                         @RequestHeader("X-User-Role") String role,
                                         @RequestHeader(value="X-Shop-Id", required=false) String callerShopId) {
        if (!canManageShop(role, callerShopId, rule.getShopId())) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok("Created", ruleRepo.save(rule)));
    }

    @PutMapping("/api/v1/pricing-rules/{id}")
    public ResponseEntity<?> updateRule(@PathVariable UUID id, @RequestBody PricingRule req,
                                         @RequestHeader("X-User-Role") String role,
                                         @RequestHeader(value="X-Shop-Id", required=false) String callerShopId) {
        return ruleRepo.findById(id).<ResponseEntity<?>>map(r -> {
            if (!canManageShop(role, callerShopId, r.getShopId())) return forbidden();
            r.setName(req.getName()); r.setActive(req.getActive());
            r.setAdjustmentValue(req.getAdjustmentValue()); r.setAdjustmentType(req.getAdjustmentType());
            return ResponseEntity.ok(ApiResponse.ok("Updated", ruleRepo.save(r)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/api/v1/pricing-rules/{id}")
    public ResponseEntity<?> deleteRule(@PathVariable UUID id,
                                         @RequestHeader("X-User-Role") String role,
                                         @RequestHeader(value="X-Shop-Id", required=false) String callerShopId) {
        return ruleRepo.findById(id).<ResponseEntity<?>>map(r -> {
            if (!canManageShop(role, callerShopId, r.getShopId())) return forbidden();
            ruleRepo.deleteById(id);
            return ResponseEntity.ok(ApiResponse.ok("Deleted", null));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private String getLangName(MenuItem m, String lang) {
        return switch(lang) { case "hi"->nvl(m.getNameHi(),m.getName()); case "ta"->nvl(m.getNameTa(),m.getName()); default->m.getName(); };
    }
    private String getLangDesc(MenuItem m, String lang) {
        return switch(lang) { case "hi"->nvl(m.getDescriptionHi(),m.getDescription()); default->m.getDescription(); };
    }
    private String getLangCatName(Category c, String lang) {
        return switch(lang) {
            case "hi"->nvl(c.getNameHi(),c.getName()); case "ta"->nvl(c.getNameTa(),c.getName());
            case "te"->nvl(c.getNameTe(),c.getName()); case "kn"->nvl(c.getNameKn(),c.getName());
            case "ml"->nvl(c.getNameMl(),c.getName()); case "bn"->nvl(c.getNameBn(),c.getName());
            default->c.getName();
        };
    }
    private String nvl(String a, String b) { return a!=null && !a.isBlank() ? a : b; }
}