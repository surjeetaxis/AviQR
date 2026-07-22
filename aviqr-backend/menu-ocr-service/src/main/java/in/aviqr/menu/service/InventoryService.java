// ── FILE: menu-service/src/main/java/in/aviqr/menu/service/InventoryService.java ──
package in.aviqr.menu.service;

import in.aviqr.menu.config.RabbitMQConfig;
import in.aviqr.menu.entity.MenuItem;
import in.aviqr.menu.entity.StockItem;
import in.aviqr.menu.repository.MenuItemRepository;
import in.aviqr.menu.repository.StockItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * MARKET FEATURE: Inventory management with auto-disable.
 *
 * When an order is placed, order-service publishes an order.new event.
 * This service listens (via RabbitMQ consumer added in InventoryConsumer.java)
 * and decrements stock for each ordered item. If stock hits 0, the menu item
 * is automatically marked unavailable — customers stop seeing it instantly.
 *
 * Owners can also set stock manually via the REST API in InventoryController.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryService {

    private final StockItemRepository stockRepo;
    private final MenuItemRepository  itemRepo;
    private final RabbitTemplate      rabbit;
    private final RestTemplate        restTemplate;

    @Value("${shop.service.url:http://shop-mall-service}")
    private String shopServiceUrl;

    /** Called when owner sets/updates stock quantity for an item */
    @Transactional
    public StockItem setStock(UUID menuItemId, String shopId, Integer qty, Integer threshold, Boolean track) {
        StockItem stock = stockRepo.findByMenuItemId(menuItemId)
            .orElseGet(() -> StockItem.builder()
                .menuItemId(menuItemId)
                .shopId(shopId)
                .build());

        if (qty       != null) stock.setStockQty(qty);
        if (threshold != null) stock.setLowStockThreshold(threshold);
        if (track     != null) stock.setTrackStock(track);

        StockItem saved = stockRepo.save(stock);

        // If we're setting qty > 0, re-enable the item (owner restocked)
        if (qty != null && qty > 0 && Boolean.TRUE.equals(track)) {
            itemRepo.findById(menuItemId).ifPresent(item -> {
                item.setAvailable(true);
                itemRepo.save(item);
                log.info("Item {} re-enabled after restock to qty={}", menuItemId, qty);
            });
        }
        return saved;
    }

    /**
     * Called by InventoryConsumer after an order is placed.
     * Decrements stock for each item in the order.
     * If stock reaches 0, auto-disables the menu item.
     *
     * @param itemId   menuItemId
     * @param quantity how many were ordered
     */
    @Transactional
    public void deductStock(UUID itemId, int quantity) {
        stockRepo.findByMenuItemId(itemId).ifPresent(stock -> {
            if (!Boolean.TRUE.equals(stock.getTrackStock()) || stock.getStockQty() == null) return;

            int updated = stockRepo.decrementStock(itemId, quantity);
            if (updated == 0) {
                log.warn("Stock deduction failed for item {} — possible race condition or insufficient qty", itemId);
                return;
            }

            // Re-fetch to get new value
            stockRepo.findByMenuItemId(itemId).ifPresent(refreshed -> {
                int newQty = refreshed.getStockQty() == null ? 0 : refreshed.getStockQty();
                log.info("Stock deducted: item={} qty={} remaining={}", itemId, quantity, newQty);

                if (newQty <= 0) {
                    // Auto-disable the item
                    itemRepo.findById(itemId).ifPresent(item -> {
                        item.setAvailable(false);
                        itemRepo.save(item);
                        log.info("Item {} auto-disabled: out of stock", itemId);
                    });
                } else if (newQty <= refreshed.getLowStockThreshold()) {
                    log.warn("LOW STOCK ALERT: item={} remaining={}", itemId, newQty);
                    publishLowStockEvent(refreshed.getShopId(), itemId, newQty);
                }
            });
        });
    }

    /**
     * Publishes to the aviqr.inventory / stock.low route — consumed by
     * notification-report-review-service's NotificationConsumer.onLowStock,
     * which saves an in-app notification and WhatsApps the owner (if a phone
     * number is resolved). Never lets a publish/lookup failure roll back the
     * stock deduction that triggered it.
     */
    private void publishLowStockEvent(String shopId, UUID itemId, int remaining) {
        try {
            String itemName = itemRepo.findById(itemId).map(MenuItem::getName).orElse("Menu item");

            Map<String, Object> event = new HashMap<>();
            event.put("shopId", shopId);
            event.put("itemName", itemName);
            event.put("remaining", remaining);
            String ownerPhone = fetchShopOwnerPhone(shopId);
            if (ownerPhone != null) event.put("ownerPhone", ownerPhone);

            rabbit.convertAndSend(RabbitMQConfig.STOCK_EXCHANGE, RabbitMQConfig.STOCK_LOW_ROUTING_KEY, event);
        } catch (Exception e) {
            log.warn("Failed to publish low-stock event for item {}: {}", itemId, e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private String fetchShopOwnerPhone(String shopId) {
        try {
            Map<String, Object> resp = restTemplate.getForObject(
                shopServiceUrl + "/api/v1/shops/" + shopId, Map.class);
            if (resp != null && resp.get("data") instanceof Map<?, ?> data) {
                Object phone = data.get("phone");
                return phone != null ? phone.toString() : null;
            }
        } catch (Exception e) {
            log.debug("Could not resolve owner phone for shop {}: {}", shopId, e.getMessage());
        }
        return null;
    }

    public List<StockItem> getShopStock(String shopId) {
        return stockRepo.findByShopId(shopId);
    }

    public List<StockItem> getOutOfStock(String shopId) {
        return stockRepo.findOutOfStockByShop(shopId);
    }

    public List<StockItem> getLowStock(String shopId) {
        return stockRepo.findLowStockByShop(shopId);
    }

    /** Summary for dashboard widget */
    public Map<String, Object> getStockSummary(String shopId) {
        List<StockItem> all     = stockRepo.findByShopId(shopId);
        List<StockItem> outOf   = stockRepo.findOutOfStockByShop(shopId);
        List<StockItem> lowList = stockRepo.findLowStockByShop(shopId);
        return Map.of(
            "totalTracked",  all.size(),
            "outOfStock",    outOf.size(),
            "lowStock",      lowList.size(),
            "outOfStockItems", outOf,
            "lowStockItems",   lowList
        );
    }
}
