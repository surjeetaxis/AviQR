package in.aviqr.menu.service;

import in.aviqr.menu.dto.ShortcodeLookupResponse;
import in.aviqr.menu.entity.MenuItem;
import in.aviqr.menu.entity.MenuShortcode;
import in.aviqr.menu.entity.MenuVariant;
import in.aviqr.menu.repository.MenuItemRepository;
import in.aviqr.menu.repository.MenuShortcodeRepository;
import in.aviqr.menu.repository.MenuVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class ShortcodeService {

    private final MenuShortcodeRepository shortcodeRepo;
    private final MenuItemRepository      itemRepo;
    private final MenuVariantRepository   variantRepo;

    public List<MenuShortcode> getByShop(String shopId) {
        return shortcodeRepo.findByShopIdOrderByCodeAsc(shopId);
    }

    public MenuShortcode create(MenuShortcode shortcode) {
        if (shortcodeRepo.existsByShopIdAndCodeIgnoreCase(shortcode.getShopId(), shortcode.getCode()))
            throw new IllegalArgumentException("Shortcode already exists for this shop");
        return shortcodeRepo.save(shortcode);
    }

    public MenuShortcode update(UUID id, MenuShortcode updated) {
        MenuShortcode existing = shortcodeRepo.findById(id).orElseThrow();
        existing.setCode(updated.getCode());
        existing.setMenuItemId(updated.getMenuItemId());
        existing.setVariantId(updated.getVariantId());
        existing.setActive(updated.getActive());
        existing.setSortOrder(updated.getSortOrder());
        return shortcodeRepo.save(existing);
    }

    public void delete(UUID id) {
        shortcodeRepo.deleteById(id);
    }

    public ShortcodeLookupResponse lookup(String shopId, String code) {
        MenuShortcode sc = shortcodeRepo.findByShopIdAndCodeIgnoreCaseAndActiveTrue(shopId, code)
                .orElseThrow(() -> new NoSuchElementException("Shortcode not found"));
        MenuItem item = itemRepo.findById(sc.getMenuItemId()).orElseThrow();

        BigDecimal price = item.getPrice();
        UUID variantId = sc.getVariantId();
        String variantName = null;
        if (variantId != null) {
            MenuVariant variant = variantRepo.findById(variantId).orElseThrow();
            price = variant.getPrice();
            variantName = variant.getVariantName();
        }

        return ShortcodeLookupResponse.builder()
                .itemId(item.getId())
                .itemName(item.getName())
                .price(price)
                .veg(item.getVeg())
                .variantId(variantId)
                .variantName(variantName)
                .build();
    }
}
