// ── FILE: menu-service/src/main/java/in/aviqr/menu/service/InventoryConsumer.java ──
package in.aviqr.menu.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Consumes order.new events from RabbitMQ and deducts stock.
 *
 * ADD TO menu-service/build.gradle:
 *   implementation 'org.springframework.amqp:spring-rabbit'
 *
 * The order-service already publishes to "aviqr.orders" exchange with key "order.new".
 * This consumer binds to the same queue and deducts stock for each ordered item.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryConsumer {

    private final InventoryService inventoryService;

    @RabbitListener(queues = "order.new.queue")
    public void onOrderPlaced(Map<String, Object> event) {
        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> items = (List<Map<String, Object>>) event.get("items");
            if (items == null || items.isEmpty()) return;

            for (Map<String, Object> item : items) {
                String itemIdStr = (String) item.get("menuItemId");
                Object qtyObj    = item.get("quantity");
                if (itemIdStr == null || qtyObj == null) continue;

                UUID menuItemId = UUID.fromString(itemIdStr);
                int  quantity   = ((Number) qtyObj).intValue();
                inventoryService.deductStock(menuItemId, quantity);
            }
        } catch (Exception e) {
            log.error("InventoryConsumer failed to process order event: {}", e.getMessage(), e);
            // Do NOT rethrow — inventory deduction failure should not fail the order
        }
    }
}
