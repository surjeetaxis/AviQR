// ── FILE: menu-service/src/main/java/in/aviqr/menu/service/InventoryConsumer.java ──
package in.aviqr.menu.service;

import in.aviqr.menu.config.RabbitMQConfig;
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
 * The order-service publishes to the "aviqr.orders" exchange with key "order.new".
 * This consumer binds its own queue (order.new.inventory.queue — see RabbitMQConfig)
 * to that exchange/key and deducts stock for each ordered item. It deliberately
 * does NOT share a queue name with notification-service's or hotel-service's
 * order.new listeners — see RabbitMQConfig for why.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryConsumer {

    private final InventoryService inventoryService;

    @RabbitListener(queues = RabbitMQConfig.ORDER_NEW_QUEUE)
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
