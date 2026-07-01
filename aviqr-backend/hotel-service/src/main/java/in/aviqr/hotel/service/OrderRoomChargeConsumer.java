package in.aviqr.hotel.service;
import in.aviqr.hotel.config.RabbitMQConfig;
import in.aviqr.hotel.entity.RoomCharge;
import in.aviqr.hotel.repository.RoomChargeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/** Turns ROOM_CHARGE orders (order-service) into a pending front-desk ledger entry. */
@Service @RequiredArgsConstructor @Slf4j
public class OrderRoomChargeConsumer {
    private final RoomChargeRepository chargeRepo;

    @RabbitListener(queues = RabbitMQConfig.ORDER_NEW_QUEUE)
    public void onNewOrder(Map<String, Object> event) {
        if (!"ROOM_CHARGE".equals(event.get("paymentMethod"))) return;
        String hotelIdStr = str(event, "hotelId");
        String roomNumber = str(event, "roomNumber");
        if (hotelIdStr == null || roomNumber == null) {
            log.warn("ROOM_CHARGE order {} missing hotelId/roomNumber — skipping", event.get("orderId"));
            return;
        }
        chargeRepo.save(RoomCharge.builder()
            .hotelId(UUID.fromString(hotelIdStr))
            .roomNumber(roomNumber)
            .shopId(str(event, "shopId"))
            .orderId(str(event, "orderId"))
            .orderNumber(str(event, "orderNumber"))
            .amount(new BigDecimal(str(event, "total")))
            .description("Order #" + str(event, "orderNumber"))
            .build());
    }

    private String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v != null ? v.toString() : null;
    }
}
