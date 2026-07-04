package in.aviqr.menu.controller;
import in.aviqr.menu.dto.*;
import in.aviqr.menu.entity.*;
import in.aviqr.menu.repository.*;
import in.aviqr.menu.service.DynamicPricingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.ResolvableType;
import org.springframework.data.domain.*;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.math.BigDecimal;
import java.util.*;

@RestController @RequiredArgsConstructor @Slf4j
public class MenuController {
    private final CategoryRepository catRepo;
    private final MenuItemRepository itemRepo;
    private final PricingRuleRepository ruleRepo;
    private final DynamicPricingService pricingService;
    private final RestTemplate restTemplate;

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
                dto.setVideoUrl(item.getVideoUrl());
                dto.setModelUrl(item.getModelUrl());
                dto.setMediaType(item.getMediaType());
                dto.setVeg(item.getVeg()); dto.setSpicy(item.getSpicy());
                dto.setPopular(item.getPopular()); dto.setAvailable(item.getAvailable());
                dto.setTag(item.getTag());
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
        resp.setShop(fetchShopInfo(shopId));
        return ResponseEntity.ok(ApiResponse.ok(resp));
    }

    // Best-effort — the customer menu page falls back to generic placeholder
    // text when this is null, so a shop-service hiccup shouldn't break the menu.
    private MenuResponse.ShopInfoDto fetchShopInfo(String shopId) {
        try {
            ParameterizedTypeReference<ApiResponse<ShopDetailsResponse>> ref = ParameterizedTypeReference.forType(
                ResolvableType.forClassWithGenerics(ApiResponse.class, ShopDetailsResponse.class).getType());
            ResponseEntity<ApiResponse<ShopDetailsResponse>> res = restTemplate.exchange(
                "http://shop-service/api/v1/shops/" + shopId, HttpMethod.GET, null, ref);
            ShopDetailsResponse s = res.getBody() != null ? res.getBody().getData() : null;
            if (s == null) return null;

            MenuResponse.ShopInfoDto dto = new MenuResponse.ShopInfoDto();
            dto.setName(s.getName()); dto.setTagline(s.getTagline());
            dto.setPhone(s.getPhone()); dto.setAddress(s.getAddress());
            dto.setRating(s.getRating()); dto.setReviews(s.getRatingCount());
            return dto;
        } catch (Exception e) {
            log.warn("Could not fetch shop info for {}: {}", shopId, e.getMessage());
            return null;
        }
    }

    // ── Category CRUD ─────────────────────────────────────────────────────────
    @GetMapping("/api/v1/categories/shop/{shopId}")
    public ResponseEntity<ApiResponse<List<Category>>> getCategories(@PathVariable String shopId) {
        return ResponseEntity.ok(ApiResponse.ok(catRepo.findByShopIdAndActiveTrueOrderBySortOrder(shopId)));
    }

    @PostMapping("/api/v1/categories")
    public ResponseEntity<ApiResponse<Category>> createCategory(@RequestBody Category cat,
                                                                 @RequestHeader("X-User-Id") String uid,
                                                                 @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if ("CUSTOMER".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Created", catRepo.save(cat)));
    }

    @PutMapping("/api/v1/categories/{id}")
    public ResponseEntity<ApiResponse<Category>> updateCategory(@PathVariable UUID id, @RequestBody Category req) {
        return catRepo.findById(id).map(c -> {
            c.setName(req.getName()); c.setEmoji(req.getEmoji()); c.setSortOrder(req.getSortOrder());
            return ResponseEntity.ok(ApiResponse.ok("Updated", catRepo.save(c)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/api/v1/categories/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable UUID id) {
        catRepo.findById(id).ifPresent(c -> { c.setActive(false); catRepo.save(c); });
        return ResponseEntity.ok(ApiResponse.ok("Deleted", null));
    }

    // ── Item CRUD ─────────────────────────────────────────────────────────────
    @GetMapping("/api/v1/items/shop/{shopId}")
    public ResponseEntity<ApiResponse<Page<MenuItem>>> getItems(
            @PathVariable String shopId,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="20") int size) {
        var all = itemRepo.findByShopIdOrderBySortOrder(shopId);
        int start = Math.min(page * size, all.size());
        int end   = Math.min(start + size, all.size());
        Page<MenuItem> paged = new PageImpl<>(all.subList(start, end),
            PageRequest.of(page, size), all.size());
        return ResponseEntity.ok(ApiResponse.ok(paged));
    }

    @GetMapping("/api/v1/items/shop/{shopId}/all")
    public ResponseEntity<ApiResponse<List<MenuItem>>> getAllItems(@PathVariable String shopId) {
        return ResponseEntity.ok(ApiResponse.ok(itemRepo.findByShopIdOrderBySortOrder(shopId)));
    }

    @PostMapping("/api/v1/items/admin/recalculate-rankings")
    public ResponseEntity<ApiResponse<String>> recalculateRankings(
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!"ADMIN".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Rankings recalculated", "OK"));
    }

    @PostMapping("/api/v1/items")
    public ResponseEntity<ApiResponse<MenuItem>> createItem(@RequestBody MenuItem item) {
        return ResponseEntity.ok(ApiResponse.ok("Created", itemRepo.save(item)));
    }

    @PutMapping("/api/v1/items/{id}")
    public ResponseEntity<ApiResponse<MenuItem>> updateItem(@PathVariable UUID id, @RequestBody MenuItem req) {
        return itemRepo.findById(id).map(item -> {
            item.setName(req.getName()); item.setPrice(req.getPrice());
            item.setDescription(req.getDescription()); item.setImageUrl(req.getImageUrl());
            item.setVideoUrl(req.getVideoUrl()); item.setModelUrl(req.getModelUrl());
            item.setMediaType(req.getMediaType());
            item.setVeg(req.getVeg()); item.setSpicy(req.getSpicy());
            item.setPopular(req.getPopular()); item.setTag(req.getTag());
            return ResponseEntity.ok(ApiResponse.ok("Updated", itemRepo.save(item)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/api/v1/items/{id}/availability")
    public ResponseEntity<ApiResponse<Void>> toggleAvailability(@PathVariable UUID id, @RequestParam boolean available) {
        itemRepo.findById(id).ifPresent(i -> { i.setAvailable(available); itemRepo.save(i); });
        return ResponseEntity.ok(ApiResponse.ok("Updated", null));
    }

    @DeleteMapping("/api/v1/items/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteItem(@PathVariable UUID id) {
        itemRepo.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok("Deleted", null));
    }

    // ── Pricing Rules ─────────────────────────────────────────────────────────
    @GetMapping("/api/v1/pricing-rules/shop/{shopId}")
    public ResponseEntity<ApiResponse<List<PricingRule>>> getRules(@PathVariable String shopId) {
        return ResponseEntity.ok(ApiResponse.ok(ruleRepo.findByShopIdAndActiveTrueOrderByPriority(shopId)));
    }

    @PostMapping("/api/v1/pricing-rules")
    public ResponseEntity<ApiResponse<PricingRule>> createRule(
            @RequestBody PricingRule rule,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if ("CUSTOMER".equals(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Created", ruleRepo.save(rule)));
    }

    @PutMapping("/api/v1/pricing-rules/{id}")
    public ResponseEntity<ApiResponse<PricingRule>> updateRule(
            @PathVariable UUID id, @RequestBody PricingRule req,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if ("CUSTOMER".equals(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ruleRepo.findById(id).map(r -> {
            r.setName(req.getName()); r.setActive(req.getActive());
            r.setAdjustmentValue(req.getAdjustmentValue()); r.setAdjustmentType(req.getAdjustmentType());
            return ResponseEntity.ok(ApiResponse.ok("Updated", ruleRepo.save(r)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/api/v1/pricing-rules/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRule(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if ("CUSTOMER".equals(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        ruleRepo.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok("Deleted", null));
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