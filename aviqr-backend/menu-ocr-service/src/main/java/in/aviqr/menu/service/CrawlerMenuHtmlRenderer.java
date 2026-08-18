package in.aviqr.menu.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.aviqr.menu.dto.MenuResponse;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// Renders a shop's menu as plain, real HTML for crawlers that don't execute
// JavaScript — see MenuController.getPublicMenuHtml for why this exists
// alongside the JSON API and the React customer menu page. Every string
// interpolated here comes from shop-owner-entered data (shop name, item
// names/descriptions), so everything goes through HtmlUtils.htmlEscape —
// this is unauthenticated, crawler-facing output, and shop owners are not a
// trusted input source for raw HTML.
public class CrawlerMenuHtmlRenderer {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public String render(String shopId, MenuResponse resp) {
        MenuResponse.ShopInfoDto shop = resp.getShop();
        String shopName = shop != null && shop.getName() != null ? shop.getName() : "Restaurant";
        String canonical = "https://aviqr.com/menu/" + shopId;
        String title = esc(shopName) + " — Menu &amp; Online Ordering | AviQR";
        String description = "Order online from " + esc(shopName)
            + (shop != null && shop.getAddress() != null ? " in " + esc(shop.getAddress()) : "")
            + ". View the full menu, prices and photos, and pay online.";

        StringBuilder body = new StringBuilder();
        body.append("<h1>").append(esc(shopName)).append("</h1>\n");
        if (shop != null) {
            if (notBlank(shop.getTagline())) body.append("<p>").append(esc(shop.getTagline())).append("</p>\n");
            if (notBlank(shop.getAddress())) body.append("<p>").append(esc(shop.getAddress())).append("</p>\n");
            if (notBlank(shop.getPhone()))   body.append("<p>Phone: ").append(esc(shop.getPhone())).append("</p>\n");
            if (shop.getRating() != null && shop.getReviews() != null && shop.getReviews() > 0) {
                body.append("<p>Rating: ").append(esc(shop.getRating().toString()))
                    .append(" (").append(shop.getReviews()).append(" reviews)</p>\n");
            }
        }

        List<MenuResponse.CategoryDto> categories = resp.getCategories() != null ? resp.getCategories() : List.of();
        for (MenuResponse.CategoryDto cat : categories) {
            List<MenuResponse.ItemDto> items = cat.getItems() != null ? cat.getItems() : List.of();
            if (items.isEmpty()) continue;
            body.append("<h2>").append(esc(cat.getName())).append("</h2>\n<ul>\n");
            for (MenuResponse.ItemDto item : items) {
                if (item.getAvailable() != null && !item.getAvailable()) continue;
                BigDecimal price = item.getEffectivePrice() != null ? item.getEffectivePrice() : item.getPrice();
                body.append("  <li><strong>").append(esc(item.getName())).append("</strong>");
                if (price != null) body.append(" — ₹").append(price.stripTrailingZeros().toPlainString());
                if (Boolean.TRUE.equals(item.getVeg())) body.append(" (veg)");
                if (notBlank(item.getDescription())) body.append(" — ").append(esc(item.getDescription()));
                body.append("</li>\n");
            }
            body.append("</ul>\n");
        }

        body.append("<p><a href=\"").append(canonical).append("\">View the live interactive menu and order online</a></p>\n");

        String jsonLd = buildJsonLd(shopId, canonical, shop, categories);

        return "<!doctype html>\n<html lang=\"en\">\n<head>\n"
            + "<meta charset=\"utf-8\">\n"
            + "<title>" + title + "</title>\n"
            + "<meta name=\"description\" content=\"" + attrEsc(description) + "\">\n"
            + "<link rel=\"canonical\" href=\"" + canonical + "\">\n"
            + "<script type=\"application/ld+json\">" + jsonLd + "</script>\n"
            + "</head>\n<body>\n" + body + "</body>\n</html>\n";
    }

    private String buildJsonLd(String shopId, String canonical, MenuResponse.ShopInfoDto shop, List<MenuResponse.CategoryDto> categories) {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("@context", "https://schema.org");
        schema.put("@type", "Restaurant");
        schema.put("name", shop != null && shop.getName() != null ? shop.getName() : "Restaurant");
        if (shop != null && notBlank(shop.getLogoUrl())) schema.put("image", shop.getLogoUrl());
        if (shop != null && notBlank(shop.getTagline())) schema.put("description", shop.getTagline());
        schema.put("url", canonical);
        if (shop != null && notBlank(shop.getPhone())) schema.put("telephone", shop.getPhone());
        if (shop != null && notBlank(shop.getAddress())) {
            Map<String, Object> address = new LinkedHashMap<>();
            address.put("@type", "PostalAddress");
            address.put("streetAddress", shop.getAddress());
            address.put("addressCountry", "IN");
            schema.put("address", address);
        }
        if (shop != null && shop.getRating() != null && shop.getReviews() != null && shop.getReviews() > 0) {
            Map<String, Object> rating = new LinkedHashMap<>();
            rating.put("@type", "AggregateRating");
            rating.put("ratingValue", shop.getRating().toString());
            rating.put("reviewCount", String.valueOf(shop.getReviews()));
            schema.put("aggregateRating", rating);
        }

        List<Map<String, Object>> sections = new ArrayList<>();
        for (MenuResponse.CategoryDto cat : categories) {
            List<MenuResponse.ItemDto> items = cat.getItems() != null ? cat.getItems() : List.of();
            if (items.isEmpty()) continue;
            List<Map<String, Object>> menuItems = new ArrayList<>();
            for (MenuResponse.ItemDto item : items) {
                if (item.getAvailable() != null && !item.getAvailable()) continue;
                Map<String, Object> mi = new LinkedHashMap<>();
                mi.put("@type", "MenuItem");
                mi.put("name", item.getName());
                if (notBlank(item.getDescription())) mi.put("description", item.getDescription());
                if (Boolean.TRUE.equals(item.getVeg())) mi.put("suitableForDiet", "https://schema.org/VegetarianDiet");
                BigDecimal price = item.getEffectivePrice() != null ? item.getEffectivePrice() : item.getPrice();
                if (price != null) {
                    Map<String, Object> offer = new LinkedHashMap<>();
                    offer.put("@type", "Offer");
                    offer.put("price", price.stripTrailingZeros().toPlainString());
                    offer.put("priceCurrency", "INR");
                    mi.put("offers", offer);
                }
                menuItems.add(mi);
            }
            if (menuItems.isEmpty()) continue;
            Map<String, Object> section = new LinkedHashMap<>();
            section.put("@type", "MenuSection");
            section.put("name", cat.getName());
            section.put("hasMenuItem", menuItems);
            sections.add(section);
        }
        if (!sections.isEmpty()) {
            Map<String, Object> menu = new LinkedHashMap<>();
            menu.put("@type", "Menu");
            menu.put("name", (shop != null && shop.getName() != null ? shop.getName() : "Restaurant") + " Menu");
            menu.put("url", canonical);
            menu.put("hasMenuSection", sections);
            schema.put("hasMenu", menu);
        }

        try {
            // Escaping '<' (as <, a valid JSON escape) neutralizes any
            // "</script>" sequence a shop/item name could contain — this JSON
            // is embedded directly inside a <script> tag below, and shop
            // owner-entered text is not a trusted input source.
            return MAPPER.writeValueAsString(schema).replace("<", "\\u003c");
        } catch (Exception e) {
            return "{}";
        }
    }

    private static boolean notBlank(String s) { return s != null && !s.isBlank(); }
    private static String esc(String s) { return s == null ? "" : HtmlUtils.htmlEscape(s); }
    private static String attrEsc(String s) { return s == null ? "" : HtmlUtils.htmlEscape(s); }
}
