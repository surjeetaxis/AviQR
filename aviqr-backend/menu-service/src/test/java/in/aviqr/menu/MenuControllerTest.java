package in.aviqr.menu;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.aviqr.menu.entity.*;
import in.aviqr.menu.repository.*;
import in.aviqr.menu.service.DynamicPricingService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = in.aviqr.menu.controller.MenuController.class,
            excludeAutoConfiguration = {
                org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class,
                org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration.class
            })
class MenuControllerTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    @MockBean CategoryRepository    catRepo;
    @MockBean MenuItemRepository    itemRepo;
    @MockBean PricingRuleRepository ruleRepo;
    @MockBean DynamicPricingService pricingService;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Category cat(String shopId, String name) {
        var c = new Category();
        c.setId(UUID.randomUUID()); c.setShopId(shopId);
        c.setName(name); c.setActive(true); c.setSortOrder(1);
        return c;
    }

    private MenuItem item(UUID catId, String shopId, String name, double price) {
        var i = new MenuItem();
        i.setId(UUID.randomUUID()); i.setCategoryId(catId); i.setShopId(shopId);
        i.setName(name); i.setPrice(BigDecimal.valueOf(price));
        i.setAvailable(true); i.setVeg(true); i.setSpicy(false); i.setPopular(false);
        return i;
    }

    // ── GET /api/v1/menu/public/{shopId} ──────────────────────────────────────

    @Test
    @DisplayName("GET /menu/public/{shopId} — returns 200 with categories and items")
    void publicMenu_returnsMenuWithCategories() throws Exception {
        var c = cat("shop-101", "Starters");
        var menuItem = item(c.getId(), "shop-101", "Paneer Tikka", 280.0);

        when(catRepo.findByShopIdAndActiveTrueOrderBySortOrder("shop-101")).thenReturn(List.of(c));
        when(itemRepo.findByCategoryIdAndAvailableTrue(c.getId())).thenReturn(List.of(menuItem));
        when(pricingService.getEffectivePrice(eq("shop-101"), any())).thenReturn(BigDecimal.valueOf(280));

        mvc.perform(get("/api/v1/menu/public/shop-101"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.success").value(true))
           .andExpect(jsonPath("$.data.shopId").value("shop-101"))
           .andExpect(jsonPath("$.data.categories[0].name").value("Starters"))
           .andExpect(jsonPath("$.data.categories[0].items[0].name").value("Paneer Tikka"));
    }

    @Test
    @DisplayName("GET /menu/public/{shopId} — shop with no categories returns empty list")
    void publicMenu_noCats_emptyCategories() throws Exception {
        when(catRepo.findByShopIdAndActiveTrueOrderBySortOrder("shop-empty")).thenReturn(List.of());

        mvc.perform(get("/api/v1/menu/public/shop-empty"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.data.categories").isEmpty());
    }

    @Test
    @DisplayName("GET /menu/public/{shopId} — category filter param respected")
    void publicMenu_catFilter_appliesFilter() throws Exception {
        var c1 = cat("shop-101", "Starters");
        var c2 = cat("shop-101", "Mains");
        when(catRepo.findByShopIdAndActiveTrueOrderBySortOrder("shop-101")).thenReturn(List.of(c1, c2));
        // Only c1 matches the cat filter
        when(itemRepo.findByCategoryIdAndAvailableTrue(c1.getId())).thenReturn(List.of());

        mvc.perform(get("/api/v1/menu/public/shop-101").param("cat", c1.getId().toString()))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.data.categories.length()").value(1));
    }

    // ── GET /api/v1/categories/shop/{shopId} ──────────────────────────────────

    @Test
    @DisplayName("GET /categories/shop/{shopId} — returns all active categories")
    void getCategories_returnsActiveCategories() throws Exception {
        var c = cat("shop-101", "Beverages");
        when(catRepo.findByShopIdAndActiveTrueOrderBySortOrder("shop-101")).thenReturn(List.of(c));

        mvc.perform(get("/api/v1/categories/shop/shop-101"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.data[0].name").value("Beverages"));
    }

    // ── POST /api/v1/categories ───────────────────────────────────────────────

    @Test
    @DisplayName("POST /categories — OWNER role creates category")
    void createCategory_ownerRole_created() throws Exception {
        var c = cat("shop-101", "Desserts");
        when(catRepo.save(any())).thenReturn(c);

        mvc.perform(post("/api/v1/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(c))
                .header("X-User-Id", "uid-1")
                .header("X-User-Role", "OWNER"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.data.name").value("Desserts"));
    }

    @Test
    @DisplayName("POST /categories — CUSTOMER role is forbidden")
    void createCategory_customerRole_403() throws Exception {
        var c = cat("shop-101", "Desserts");
        mvc.perform(post("/api/v1/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(c))
                .header("X-User-Id", "uid-1")
                .header("X-User-Role", "CUSTOMER"))
           .andExpect(status().isForbidden());
    }

    // ── PUT /api/v1/categories/{id} ───────────────────────────────────────────

    @Test
    @DisplayName("PUT /categories/{id} — updates category name")
    void updateCategory_existingId_updatesName() throws Exception {
        var c = cat("shop-101", "Old Name");
        when(catRepo.findById(c.getId())).thenReturn(Optional.of(c));
        when(catRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var patch = cat("shop-101", "New Name");
        mvc.perform(put("/api/v1/categories/" + c.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(patch)))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.data.name").value("New Name"));
    }

    @Test
    @DisplayName("PUT /categories/{id} — unknown ID returns 404")
    void updateCategory_unknownId_404() throws Exception {
        when(catRepo.findById(any())).thenReturn(Optional.empty());
        mvc.perform(put("/api/v1/categories/" + UUID.randomUUID())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(cat("shop-101", "X"))))
           .andExpect(status().isNotFound());
    }

    // ── DELETE /api/v1/categories/{id} ───────────────────────────────────────

    @Test
    @DisplayName("DELETE /categories/{id} — soft-deletes by setting active=false")
    void deleteCategory_softDeletes() throws Exception {
        var c = cat("shop-101", "To Delete");
        when(catRepo.findById(c.getId())).thenReturn(Optional.of(c));

        mvc.perform(delete("/api/v1/categories/" + c.getId()))
           .andExpect(status().isOk());

        verify(catRepo).save(argThat(saved -> !saved.getActive()));
    }

    // ── GET /api/v1/items/shop/{shopId} ──────────────────────────────────────

    @Test
    @DisplayName("GET /items/shop/{shopId} — returns paged menu items")
    void getItems_returnsPagedItems() throws Exception {
        var c = cat("shop-101", "Mains");
        var mi = item(c.getId(), "shop-101", "Butter Chicken", 380.0);
        when(itemRepo.findByShopIdOrderBySortOrder("shop-101")).thenReturn(List.of(mi));

        mvc.perform(get("/api/v1/items/shop/shop-101"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.data.content[0].name").value("Butter Chicken"));
    }
}
