package in.aviqr.menu.controller;
import in.aviqr.menu.dto.*;
import in.aviqr.menu.entity.*;
import in.aviqr.menu.repository.*;
import in.aviqr.menu.service.DynamicPricingService;
import in.aviqr.menu.service.MenuImportService;
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
    private final MenuVariantRepository variantRepo;
    private final MenuAddonRepository addonRepo;
    private final DynamicPricingService pricingService;
    private final RestTemplate restTemplate;
    private final MenuImportService importService;

    // ── Public endpoint — called by customer QR scan ──────────────────────────
    @GetMapping("/api/v1/menu/public/{shopId}")
    public ResponseEntity<ApiResponse<MenuResponse>> getPublicMenu(
            @PathVariable String shopId,
            @RequestParam(defaultValue="en") String lang,
            @RequestParam(required=false) String cat) {
        return ResponseEntity.ok(ApiResponse.ok(buildMenuResponse(shopId, lang, cat)));
    }

    // Real, crawlable HTML for the same shop — the React customer menu at
    // aviqr.com/menu/{shopId} is client-rendered, so a crawler that doesn't
    // execute JavaScript (most AI crawlers — GPTBot, ClaudeBot,
    // PerplexityBot, unlike Googlebot) never sees the menu content or the
    // Restaurant/Menu structured data, no matter what SEO tags the React
    // page declares. nginx routes known crawler User-Agents hitting
    // /menu/{shopId} here instead of the SPA (see DEPLOYMENT*.md); everyone
    // else still gets the normal interactive app. Covered by the same
    // gateway route as getPublicMenu above (/api/v1/menu/public/**), no
    // separate route needed.
    @GetMapping(value = "/api/v1/menu/public/{shopId}/html", produces = org.springframework.http.MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> getPublicMenuHtml(@PathVariable String shopId) {
        MenuResponse resp = buildMenuResponse(shopId, "en", null);
        return ResponseEntity.ok().contentType(org.springframework.http.MediaType.TEXT_HTML)
            .body(new in.aviqr.menu.service.CrawlerMenuHtmlRenderer().render(shopId, resp));
    }

    private MenuResponse buildMenuResponse(String shopId, String lang, String cat) {
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
                dto.setVariants(variantRepo.findByMenuItemIdOrderBySortOrderAsc(item.getId()).stream()
                    .filter(MenuVariant::getActive)
                    .map(v -> {
                        MenuResponse.VariantDto vd = new MenuResponse.VariantDto();
                        vd.setId(v.getId()); vd.setVariantName(v.getVariantName());
                        vd.setPrice(v.getPrice()); vd.setIsDefault(v.getIsDefault());
                        return vd;
                    }).toList());
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
        resp.setAddons(addonRepo.findByShopIdAndActiveTrue(shopId).stream().map(a -> {
            MenuResponse.AddonDto ad = new MenuResponse.AddonDto();
            ad.setId(a.getId()); ad.setName(a.getName()); ad.setPrice(a.getPrice()); ad.setVeg(a.getVeg());
            return ad;
        }).toList());
        return resp;
    }

    // Best-effort — the customer menu page falls back to generic placeholder
    // text when this is null, so a shop-service hiccup shouldn't break the menu.
    private MenuResponse.ShopInfoDto fetchShopInfo(String shopId) {
        try {
            ParameterizedTypeReference<ApiResponse<ShopDetailsResponse>> ref = ParameterizedTypeReference.forType(
                ResolvableType.forClassWithGenerics(ApiResponse.class, ShopDetailsResponse.class).getType());
            ResponseEntity<ApiResponse<ShopDetailsResponse>> res = restTemplate.exchange(
                "http://shop-mall-service/api/v1/shops/" + shopId, HttpMethod.GET, null, ref);
            ShopDetailsResponse s = res.getBody() != null ? res.getBody().getData() : null;
            if (s == null) return null;

            MenuResponse.ShopInfoDto dto = new MenuResponse.ShopInfoDto();
            dto.setName(s.getName()); dto.setTagline(s.getTagline());
            dto.setPhone(s.getPhone()); dto.setAddress(s.getAddress());
            dto.setLogoUrl(s.getLogoUrl());
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

    // ── Bulk import from CSV/Excel ────────────────────────────────────────────
    @PostMapping("/api/v1/menu/import")
    public ResponseEntity<ApiResponse<MenuImportService.ImportResult>> importMenu(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam String shopId,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if ("OWNER".equals(role) && !callerShopId.isBlank() && !callerShopId.equals(shopId))
            return ResponseEntity.status(403).body(ApiResponse.error("Shop mismatch"));
        if (file.isEmpty()) return ResponseEntity.badRequest().body(ApiResponse.error("File is empty"));
        try {
            MenuImportService.ImportResult result = importService.importFile(shopId, file);
            log.info("Menu import for shop {}: {} categories, {} items, {} row errors",
                shopId, result.getCategoriesCreated(), result.getItemsCreated(), result.getErrors().size());
            return ResponseEntity.ok(ApiResponse.ok("Import complete", result));
        } catch (Exception e) {
            log.warn("Menu import failed for shop {}: {}", shopId, e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error("Could not read file: " + e.getMessage()));
        }
    }

    @GetMapping("/api/v1/menu/import/sample.csv")
    public ResponseEntity<byte[]> sampleCsv() {
        byte[] body = importService.sampleCsv();
        return ResponseEntity.ok()
            .header("Content-Type", "text/csv")
            .header("Content-Disposition", "attachment; filename=\"aviqr-menu-sample.csv\"")
            .body(body);
    }

    @GetMapping("/api/v1/menu/import/sample.xlsx")
    public ResponseEntity<byte[]> sampleXlsx() throws java.io.IOException {
        byte[] body = importService.sampleXlsx();
        return ResponseEntity.ok()
            .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            .header("Content-Disposition", "attachment; filename=\"aviqr-menu-sample.xlsx\"")
            .body(body);
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

    // ── Head-office: copy a shop's full menu (categories + items) to other outlets ──
    @PostMapping("/api/v1/menu/copy")
    public ResponseEntity<ApiResponse<Map<String, Object>>> copyMenu(
            @RequestBody MenuCopyRequest req,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if ("CUSTOMER".equals(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        List<Category> sourceCategories = catRepo.findByShopIdAndActiveTrueOrderBySortOrder(req.fromShopId());
        List<MenuItem> sourceItems = itemRepo.findByShopIdOrderBySortOrder(req.fromShopId());

        int categoriesCopied = 0, itemsCopied = 0;
        for (String toShopId : req.toShopIds()) {
            if (toShopId.equals(req.fromShopId())) continue;
            Map<UUID, UUID> categoryIdMap = new HashMap<>();
            for (Category c : sourceCategories) {
                Category copy = Category.builder()
                    .name(c.getName()).nameHi(c.getNameHi()).nameTa(c.getNameTa()).nameTe(c.getNameTe())
                    .nameKn(c.getNameKn()).nameMl(c.getNameMl()).nameBn(c.getNameBn()).nameMr(c.getNameMr()).nameGu(c.getNameGu())
                    .emoji(c.getEmoji()).shopId(toShopId).sortOrder(c.getSortOrder()).active(true)
                    .build();
                categoryIdMap.put(c.getId(), catRepo.save(copy).getId());
                categoriesCopied++;
            }
            for (MenuItem item : sourceItems) {
                UUID newCategoryId = categoryIdMap.get(item.getCategoryId());
                if (newCategoryId == null) continue; // source category was inactive/skipped
                MenuItem copy = MenuItem.builder()
                    .name(item.getName()).nameHi(item.getNameHi()).nameTa(item.getNameTa()).nameTe(item.getNameTe())
                    .description(item.getDescription()).descriptionHi(item.getDescriptionHi())
                    .categoryId(newCategoryId).shopId(toShopId).price(item.getPrice())
                    .imageUrl(item.getImageUrl()).videoUrl(item.getVideoUrl()).modelUrl(item.getModelUrl())
                    .mediaType(item.getMediaType()).veg(item.getVeg()).spicy(item.getSpicy())
                    .popular(item.getPopular()).available(true).tag(item.getTag()).sortOrder(item.getSortOrder())
                    .build();
                itemRepo.save(copy);
                itemsCopied++;
            }
        }
        return ResponseEntity.ok(ApiResponse.ok("Menu copied",
            Map.of("categoriesCopied", categoriesCopied, "itemsCopied", itemsCopied, "outletsUpdated", req.toShopIds().size())));
    }

    record MenuCopyRequest(String fromShopId, List<String> toShopIds) {}

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