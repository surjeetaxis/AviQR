package in.aviqr.notification.service;

import in.aviqr.notification.entity.Notification;
import in.aviqr.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Map;

@Service @RequiredArgsConstructor @Slf4j
public class NotificationConsumer {

    private final NotificationRepository repo;

    @RabbitListener(queues = "order.new.queue")
    public void onNewOrder(Map<String, Object> event) {
        log.info("New order event received: {}", event);
        String shopId  = (String) event.get("shopId");
        String orderId = (String) event.get("orderId");
        String total   = (String) event.get("total");

        // Notify shop owner
        Notification n = Notification.builder()
            .userId(shopId)  // shopId doubles as owner notification target
            .title("New Order!")
            .body("Order #" + orderId + " · ₹" + total)
            .type("ORDER_NEW")
            .shopId(shopId)
            .orderId(orderId)
            .createdAt(LocalDateTime.now())
            .build();
        repo.save(n);
        // In production: push FCM / send WhatsApp via Twilio
    }

    @RabbitListener(queues = "hotel.request.queue")
    public void onHotelRequest(Map<String, Object> event) {
        log.info("Hotel request event: {}", event);
        String hotelId    = (String) event.get("hotelId");
        String roomNumber = (String) event.get("roomNumber");
        String service    = (String) event.get("service");

        Notification n = Notification.builder()
            .userId(hotelId)
            .title("Guest Request — Room " + roomNumber)
            .body(service + " request from Room " + roomNumber)
            .type("HOTEL_REQUEST")
            .referenceId(hotelId)
            .createdAt(LocalDateTime.now())
            .build();
        repo.save(n);
    }
}
