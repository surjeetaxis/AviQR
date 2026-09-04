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
    private final Msg91Service            msg91;
    private final NightAuditPdfService    nightAuditPdf;

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

    // ── PMS balance-due reminder (published daily by pms-service's
    // ReservationLifecycleScheduler for a guest who checked out with an unpaid balance) ──
    @RabbitListener(queues = RabbitMQConfig.PMS_BALANCE_DUE_QUEUE)
    public void onPmsBalanceDue(Map<String, Object> event) {
        String hotelId      = str(event, "hotelId");
        String reservationId= str(event, "reservationId");
        String guestName    = str(event, "guestName");
        String guestPhone   = str(event, "guestPhone");
        String balance      = str(event, "balance");

        save(hotelId, "Balance Due — " + (guestName == null || guestName.isBlank() ? "Guest" : guestName),
             "₹" + balance + " outstanding after checkout", "PMS_BALANCE_DUE", hotelId, reservationId);

        if (guestPhone != null && !guestPhone.isBlank()) {
            whatsApp.send(guestPhone, String.format(
                "Hi %s, thanks for staying with us! Our records show a balance of ₹%s remaining on your folio. Please reach out to the front desk at your earliest convenience to settle it.",
                (guestName == null || guestName.isBlank()) ? "there" : guestName, balance));
        }
    }

    // ── PMS scheduled night-audit report (published daily by pms-service's
    // NightAuditEmailScheduler for every active hotel with an email on file) ──
    @RabbitListener(queues = RabbitMQConfig.PMS_REPORT_READY_QUEUE)
    public void onPmsReportReady(Map<String, Object> event) {
        String hotelId    = str(event, "hotelId");
        String hotelEmail = str(event, "hotelEmail");
        String hotelName  = str(event, "hotelName");
        String date       = str(event, "date");
        if (hotelEmail == null || hotelEmail.isBlank()) return;

        byte[] pdf;
        try {
            pdf = nightAuditPdf.render(event);
        } catch (Exception e) {
            log.error("Could not render night-audit PDF for hotel {}: {}", hotelId, e.getMessage());
            return;
        }
        String base64 = java.util.Base64.getEncoder().encodeToString(pdf);
        String subject = "Night Audit — " + hotelName + " — " + date;
        boolean sent = email.send(hotelEmail, subject,
            "<p>Your night audit report for " + date + " is attached.</p>",
            "night-audit-" + date + ".pdf", "application/pdf", base64);

        save(hotelId, "Night Audit Emailed", subject, "PMS_REPORT_READY", hotelId, null);
        if (!sent) log.warn("Night-audit email to {} failed for hotel {}", hotelEmail, hotelId);
    }

    // ── PMS waitlist slot opened up (published by pms-service's WaitlistService
    // when a cancellation/no-show frees enough inventory for a waiting guest) ──
    @RabbitListener(queues = RabbitMQConfig.PMS_WAITLIST_AVAILABLE_QUEUE)
    public void onPmsWaitlistAvailable(Map<String, Object> event) {
        String hotelId      = str(event, "hotelId");
        String guestName    = str(event, "guestName");
        String guestPhone   = str(event, "guestPhone");
        String checkInDate  = str(event, "checkInDate");
        String checkOutDate = str(event, "checkOutDate");

        save(hotelId, "Waitlist Slot Available — " + (guestName == null || guestName.isBlank() ? "Guest" : guestName),
             "Room now available for " + checkInDate + " to " + checkOutDate, "PMS_WAITLIST_AVAILABLE", hotelId, null);

        if (guestPhone != null && !guestPhone.isBlank()) {
            whatsApp.send(guestPhone, String.format(
                "Hi %s, good news! A room is now available for your requested dates (%s to %s). Please contact the front desk soon to confirm your booking.",
                (guestName == null || guestName.isBlank()) ? "there" : guestName, checkInDate, checkOutDate));
        }
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
    // Email-only for now (via MSG91 — see Msg91Service javadoc): SMS/WhatsApp aren't
    // production-ready yet (DLT template pending, no WhatsApp Business number connected), so
    // OTP login/register is email-based end to end — auth-service always publishes an email.
    @RabbitListener(queues = NotificationRabbitConfig.OTP_REQUESTED_QUEUE)
    public void onOtpRequested(Map<String, Object> event) {
        String email = str(event, "email");
        String otp   = str(event, "otp");
        if (email == null || email.isBlank() || otp == null || otp.isBlank()) return;

        String name = str(event, "name");
        msg91.sendOtpEmail(email, name, otp);
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

    // ── Sales lead outreach (published by support-service, only after a staff
    // member explicitly clicks "send" on one drafted email — see LeadController) ──
    // The compliance footer (sender identity + opt-out) is appended here rather
    // than stored on the draft, so every lead email carries it regardless of what
    // staff typed, and editing a draft can never accidentally drop it.
    @RabbitListener(queues = NotificationRabbitConfig.LEAD_EMAIL_SEND_QUEUE)
    public void onLeadEmailSend(Map<String, Object> event) {
        String to      = str(event, "to");
        String subject = str(event, "subject");
        String body    = str(event, "body");
        if (to == null || to.isBlank() || body == null) return;

        String html = body.replace("\n", "<br>") +
            "<hr style=\"margin-top:24px;border:none;border-top:1px solid #E5E7EB\">" +
            "<p style=\"font-size:12px;color:#6B7280\">" +
            "AviQR Technologies Pvt Ltd, Bengaluru, Karnataka, India · " +
            "<a href=\"mailto:partnerships@aviqr.com?subject=Unsubscribe\">Unsubscribe / opt out of future emails</a>" +
            "</p>";
        email.send(to, subject, html);
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
