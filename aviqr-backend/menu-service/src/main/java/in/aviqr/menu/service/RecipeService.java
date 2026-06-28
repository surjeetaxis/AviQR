package in.aviqr.menu.service;

import in.aviqr.menu.entity.*;
import in.aviqr.menu.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.*;

@Service @RequiredArgsConstructor
public class RecipeService {

    private final RecipeItemRepository  recipeRepo;
    private final RawMaterialRepository materialRepo;

    // ── Recipe ────────────────────────────────────────────────────────────────

    public List<RecipeItem> getRecipe(UUID menuItemId) {
        return recipeRepo.findByMenuItemId(menuItemId);
    }

    @Transactional
    public List<RecipeItem> saveRecipe(UUID menuItemId, List<RecipeItem> items) {
        recipeRepo.deleteByMenuItemId(menuItemId);
        items.forEach(i -> {
            i.setId(null);
            i.setMenuItemId(menuItemId);
            // Calculate cost contribution
            materialRepo.findById(i.getRawMaterialId()).ifPresent(mat -> {
                i.setRawMaterialName(mat.getName());
                if (mat.getCostPerUnit() != null && i.getQuantity() != null) {
                    i.setCostContribution(mat.getCostPerUnit().multiply(i.getQuantity()));
                }
            });
        });
        return recipeRepo.saveAll(items);
    }

    /** Total ingredient cost for one portion of a dish */
    public BigDecimal calculateDishCost(UUID menuItemId) {
        return recipeRepo.findByMenuItemId(menuItemId).stream()
            .map(r -> r.getCostContribution() != null ? r.getCostContribution() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // ── Raw Materials ─────────────────────────────────────────────────────────

    public List<RawMaterial> getMaterials(String shopId) {
        return materialRepo.findByShopIdAndActiveTrueOrderByNameAsc(shopId);
    }

    public RawMaterial createMaterial(RawMaterial m) {
        return materialRepo.save(m);
    }

    public RawMaterial updateMaterial(UUID id, RawMaterial updated) {
        RawMaterial m = materialRepo.findById(id).orElseThrow();
        m.setName(updated.getName());
        m.setUnit(updated.getUnit());
        m.setCurrentStock(updated.getCurrentStock());
        m.setMinStockLevel(updated.getMinStockLevel());
        m.setCostPerUnit(updated.getCostPerUnit());
        m.setSupplier(updated.getSupplier());
        return materialRepo.save(m);
    }

    public List<RawMaterial> getLowStockMaterials(String shopId) {
        return materialRepo.findLowStock(shopId);
    }

    @Transactional
    public void adjustStock(UUID materialId, BigDecimal delta, String reason) {
        RawMaterial m = materialRepo.findById(materialId).orElseThrow();
        m.setCurrentStock(m.getCurrentStock().add(delta));
        materialRepo.save(m);
    }
}
