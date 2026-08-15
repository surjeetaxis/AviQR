package in.aviqr.notification.service;

import in.aviqr.notification.config.NotificationRabbitConfig;
import in.aviqr.notification.config.RabbitMQConfig;
import in.aviqr.notification.entity.Notification;
import in.aviqr.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service @RequiredArgsConstructor @Slf4j
public class NotificationConsumer {

    private final NotificationRepository repo;
    private final WaSenderWhatsAppService whatsApp;
    private final ElasticEmailService     email;
    private final TwilioSmsService        sms;

    // ── New order placed ──────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    @RabbitListener(queues = RabbitMQConfig.ORDER_NEW_QUEUE)
    public void onNewOrder(Map<String, Object> event) {
        log.info("New order event: {}", event.get("orderNumber"));
        String shopId       = str(event, "shopId");
        String orderId      = str(event, "orderId");
        String orderNumber  = str(event, "orderNumber");
        String total        = str(event, "total");
        String customerPhone= str(event, "customerPhone");
        String customerName = str(event, "customerName");
        String tableNumber  = str(event, "tableNumber");

        // 1. In-app notification for owner dashboard
        save(shopId, "New Order!", "Order #" + orderNumber + " · ₹" + total,
             "ORDER_NEW", shopId, orderId);

        // 2. WhatsApp to customer (order confirmation)
        if (customerPhone != null && !customerPhone.isBlank()) {
            String msg = String.format(
                "✅ *Order Confirmed!*\nHi %s, your order #%s has been placed at Table %s.\nTotal: ₹%s\nWe'll notify you when it's ready! 🍽️",
                customerName, orderNumber, tableNumber != null ? tableNumber : "—", total);
            whatsApp.send(customerPhone, msg);
        }

        // 3. WhatsApp to owner (new order alert)
        // ownerPhone fetched via event payload (published by order-service from shop-service)
        String ownerPhone = str(event, "ownerPhone");
        if (ownerPhone != null && !ownerPhone.isBlank()) {
            List<Map<String,Object>> items = event.get("items") instanceof List<?> l
                ? (List<Map<String,Object>>) l : List.of();
            StringBuilder sb = new StringBuilder();
            items.forEach(i -> sb.append("• ").append(i.get("itemName"))
                .append(" ×").append(i.get("quantity")).append("\n"));
            whatsApp.send(ownerPhone, String.format(
                "🔔 *New Order!*\n#%s · Table %s\n%s\nTotal: ₹%s",
                orderNumber, tableNumber, sb.toString().strip(), total));
        }
    }

    // ── Order status changed ──────────────────────────────────────────────────
    @RabbitListener(queues = RabbitMQConfig.ORDER_STATUS_QUEUE)
    public void onOrderStatus(Map<String, Object> event) {
        String status       = str(event, "status");
        String shopId       = str(event, "shopId");
        String orderId      = str(event, "orderId");
        String orderNumber  = str(event, "orderNumber");
        String customerPhone= str(event, "customerPhone");
        String customerName = str(event, "customerName");
        String tableNumber  = str(event, "tableNumber");

        if ("READY".equalsIgnoreCase(status)) {
            save(shopId, "Order Ready!", "Order #" + orderNumber + " is ready for pickup",
                 "ORDER_READY", shopId, orderId);
            if (customerPhone != null && !customerPhone.isBlank()) {
                whatsApp.send(customerPhone, String.format(
                    "✅ *Your order is ready!*\nHi %s, Order #%s (Table %s) is ready.\nPlease come collect it! 🍽️",
                    customerName, orderNumber, tableNumber));
            }
        } else if ("CANCELLED".equalsIgnoreCase(status)) {
            save(shopId, "Order Cancelled", "Order #" + orderNumber + " was cancelled",
                 "ORDER_CANCELLED", shopId, orderId);
        }
    }

    // ── Hotel room request ────────────────────────────────────────────────────
    @RabbitListener(queues = RabbitMQConfig.HOTEL_REQ_QUEUE)
    public void onHotelRequest(Map<String, Object> event) {
        String hotelId    = str(event, "hotelId");
        String roomNumber = str(event, "roomNumber");
        String service    = str(event, "service");
        save(hotelId, "Guest Request — Room " + roomNumber,
             service + " request from Room " + roomNumber, "HOTEL_REQUEST", hotelId, null);
    }

    // ── Low stock alert ───────────────────────────────────────────────────────
    @RabbitListener(queues = RabbitMQConfig.STOCK_LOW_QUEUE)
    public void onLowStock(Map<String, Object> event) {
        String shopId    = str(event, "shopId");
        String itemName  = str(event, "itemName");
        String ownerPhone= str(event, "ownerPhone");
        int    remaining = event.get("remaining") instanceof Number n ? n.intValue() : 0;

        save(shopId, "Low Stock: " + itemName,
             "Only " + remaining + " remaining — restock soon", "STOCK_LOW", shopId, null);

        if (ownerPhone != null && !ownerPhone.isBlank()) {
            whatsApp.send(ownerPhone, String.format(
                "⚠️ *Low Stock Alert*\n*%s* is running low — only *%d* remaining.\nUpdate in AviQR dashboard.",
                itemName, remaining));
        }
    }

    // ── Login/register OTP (triggered by auth-service via RabbitMQ) ──────────
    @RabbitListener(queues = NotificationRabbitConfig.OTP_REQUESTED_QUEUE)
    public void onOtpRequested(Map<String, Object> event) {
        String phone = str(event, "phone");
        String otp   = str(event, "otp");
        if (phone == null || phone.isBlank() || otp == null || otp.isBlank()) return;
        sms.send(phone, "Your AviQR verification code is " + otp + ". Valid for 10 minutes. Do not share this code.");
    }

    // ── Welcome email (triggered by auth-service via RabbitMQ on register) ───
    @RabbitListener(queues = "user.registered.queue")
    public void onUserRegistered(Map<String, Object> event) {
        String to   = str(event, "email");
        String name = str(event, "name");
        if (to == null || to.isBlank()) return;
        String html = String.format(
            "<p>Hi %s,</p>" +
            "<p>Welcome to AviQR — India's QR-powered restaurant management platform!</p>" +
            "<p>Here's how to get started:</p>" +
            "<ol>" +
            "<li>Complete your shop profile</li>" +
            "<li>Add your menu items</li>" +
            "<li>Generate your table QR codes</li>" +
            "<li>Share with customers!</li>" +
            "</ol>" +
            "<p><a href=\"https://aviqr.com/dashboard\">Dashboard</a> · Support: support@aviqr.com</p>" +
            "<p>Happy serving! 🚀<br>— The AviQR Team</p>", name);
        email.send(to, "Welcome to AviQR! 🍽️", html);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private void save(String userId, String title, String body, String type, String shopId, String orderId) {
        try {
            repo.save(Notification.builder()
                .userId(userId).title(title).body(body).type(type)
                .shopId(shopId).orderId(orderId).createdAt(LocalDateTime.now()).build());
        } catch (Exception e) { log.error("Failed to save notification: {}", e.getMessage()); }
    }

    private String str(Map<String, Object> m, String k) {
        Object v = m.get(k); return v != null ? v.toString() : null;
    }
}
