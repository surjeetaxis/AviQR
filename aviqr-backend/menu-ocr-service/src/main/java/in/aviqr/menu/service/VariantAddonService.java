package in.aviqr.menu.service;

import in.aviqr.menu.entity.*;
import in.aviqr.menu.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service @RequiredArgsConstructor
public class VariantAddonService {

    private final MenuVariantRepository variantRepo;
    private final MenuAddonRepository   addonRepo;

    // ── Variants ──────────────────────────────────────────────────────────────

    public List<MenuVariant> getVariants(UUID menuItemId) {
        return variantRepo.findByMenuItemIdOrderBySortOrderAsc(menuItemId);
    }

    @Transactional
    public List<MenuVariant> saveVariants(UUID menuItemId, List<MenuVariant> variants) {
        variantRepo.deleteByMenuItemId(menuItemId);
        variants.forEach(v -> { v.setId(null); v.setMenuItemId(menuItemId); });
        return variantRepo.saveAll(variants);
    }

    public void deleteVariants(UUID menuItemId) {
        variantRepo.deleteByMenuItemId(menuItemId);
    }

    // ── Add-ons ───────────────────────────────────────────────────────────────

    public List<MenuAddon> getAddons(String shopId) {
        return addonRepo.findByShopIdAndActiveTrue(shopId);
    }

    public MenuAddon createAddon(MenuAddon addon) {
        return addonRepo.save(addon);
    }

    public MenuAddon updateAddon(UUID id, MenuAddon updated) {
        MenuAddon existing = addonRepo.findById(id).orElseThrow();
        existing.setName(updated.getName());
        existing.setPrice(updated.getPrice());
        existing.setVeg(updated.getVeg());
        existing.setActive(updated.getActive());
        return addonRepo.save(existing);
    }

    public void deleteAddon(UUID id) {
        addonRepo.deleteById(id);
    }
}
