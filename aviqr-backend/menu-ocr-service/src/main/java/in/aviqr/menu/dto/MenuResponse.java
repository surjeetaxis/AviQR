package in.aviqr.menu.dto;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class MenuResponse {
    String shopId;
    String lang;
    ShopInfoDto shop;
    List<CategoryDto> categories;
    // Shop-wide add-ons (e.g. Extra Cheese ₹30) any item can be customised with
    List<AddonDto> addons;

    // Real shop info for the customer menu banner — name/tagline/rating/phone/
    // address, instead of the page falling back to generic placeholder text.
    @Data
    public static class ShopInfoDto {
        String name; String tagline; String phone; String address;
        BigDecimal rating; Integer reviews;
    }

    @Data
    public static class CategoryDto {
        UUID id; String name; String emoji; List<ItemDto> items;
    }
    @Data
    public static class ItemDto {
        UUID id; String name; String description; BigDecimal price;
        BigDecimal effectivePrice;
        String imageUrl; String videoUrl; String modelUrl; String mediaType;
        Boolean veg; Boolean spicy; Boolean popular;
        Boolean available; String tag;
        // e.g. Small/Medium/Large, Half/Full — each with its own price
        List<VariantDto> variants;
    }
    @Data
    public static class VariantDto {
        UUID id; String variantName; BigDecimal price; Boolean isDefault;
    }
    @Data
    public static class AddonDto {
        UUID id; String name; BigDecimal price; Boolean veg;
    }
}