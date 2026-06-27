package in.aviqr.menu.dto;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class MenuResponse {
    String shopId;
    String lang;
    List<CategoryDto> categories;

    @Data
    public static class CategoryDto {
        UUID id; String name; String emoji; List<ItemDto> items;
    }
    @Data
    public static class ItemDto {
        UUID id; String name; String description; BigDecimal price;
        BigDecimal effectivePrice; // after dynamic pricing
        String imageUrl; Boolean veg; Boolean spicy; Boolean popular;
        Boolean available; String tag;
        BigDecimal rating; Integer ratingCount; // Product Ranking
    }
}