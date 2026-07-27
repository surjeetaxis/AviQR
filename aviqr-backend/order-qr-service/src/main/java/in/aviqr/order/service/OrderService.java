package in.aviqr.order.service;
import in.aviqr.order.dto.*;
import in.aviqr.order.entity.*;
import in.aviqr.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service @RequiredArgsConstructor @Slf4j
public class OrderService {
    private final OrderRepository repo;
    private final RabbitTemplate rabbit;
    private final RestTemplate restTemplate;

    /** Default GST slab — used when shop-service cannot be reached */
    private static final BigDecimal DEFAULT_GST = BigDecimal.valueOf(5.0);

    @Value("${shop.service.url:http://shop-mall-service}")
    private String shopServiceUrl;

    @Transactional
    public OrderResponse create(String shopId, String customerId, CreateOrderRequest req, boolean selfService) {
        BigDecimal subtotal = req.getItems().stream()
            .map(i -> i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // ── Bill break-up: subtotal → discount/service charge → tax → total ──
        // Discount/service charge are staff-applied billing decisions — a self-service
        // (customer QR) order must never be able to set its own discount, or a crafted
        // request could zero out the bill. Only honor these fields on staff-created (POS) orders.
        BigDecimal discount      = (!selfService && req.getDiscount()      != null) ? req.getDiscount()      : BigDecimal.ZERO;
        BigDecimal serviceCharge = (!selfService && req.getServiceCharge() != null) ? req.getServiceCharge() : BigDecimal.ZERO;
        // Discount can't exceed subtotal+serviceCharge — clamp rather than let the bill go negative
        BigDecimal taxableAmount = subtotal.subtract(discount).add(serviceCharge).max(BigDecimal.ZERO);
        BigDecimal gstRate = fetchShopTaxPercent(shopId);
        BigDecimal tax   = taxableAmount.multiply(gstRate)
                                         .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal total = taxableAmount.add(tax);
        // ────────────────────────────────────────────────────────────────────

        PaymentMethod paymentMethod = PaymentMethod.valueOf(req.getPaymentMethod().toUpperCase());
        if (paymentMethod == PaymentMethod.ROOM_CHARGE && (req.getHotelId() == null || req.getRoomNumber() == null || req.getRoomNumber().isBlank())) {
            throw new IllegalArgumentException("hotelId and roomNumber are required for ROOM_CHARGE orders");
        }

        // Self-service orders (customer QR ordering) are held back from the kitchen until a
        // cashier/owner confirms payment at the counter (or online payment is captured) —
        // ROOM_CHARGE is pre-authorized (billed to the room) so it skips the gate like ONLINE
        // does once paid. Staff-created POS orders (selfService=false) skip the gate entirely
        // since the cashier is collecting payment in the same motion as creating the order.
        OrderStatus initialStatus = (selfService && paymentMethod != PaymentMethod.ROOM_CHARGE)
            ? OrderStatus.PENDING_PAYMENT : OrderStatus.NEW;

        Order order = Order.builder()
            .orderNumber("ORD-" + System.currentTimeMillis())
            .shopId(shopId)
            .customerId(customerId)
            .customerName(req.getCustomerName())
            .customerPhone(req.getCustomerPhone())
            .tableNumber(req.getTableNumber())
            .hotelId(paymentMethod == PaymentMethod.ROOM_CHARGE ? req.getHotelId() : null)
            .roomNumber(paymentMethod == PaymentMethod.ROOM_CHARGE ? req.getRoomNumber() : null)
            .type(req.getType() != null ? OrderType.valueOf(req.getType().toUpperCase()) : OrderType.DINE_IN)
            .status(initialStatus)
            .paymentMethod(paymentMethod)
            .subtotal(subtotal).discount(discount).serviceCharge(serviceCharge).tax(tax).totalAmount(total)
            .notes(req.getNotes())
            .confirmationCode(generateConfirmationCode(shopId))
            .build();

        List<OrderItem> items = req.getItems().stream().map(i -> OrderItem.builder()
            .order(order)
            .menuItemId(i.getMenuItemId())
            .itemName(i.getItemName())
            .variantName(i.getVariantName())
            .quantity(i.getQuantity())
            .unitPrice(i.getUnitPrice())
            .totalPrice(i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
            .notes(i.getNotes())
            .addons(i.getAddons() != null ? i.getAddons().stream()
                .map(a -> OrderItemAddon.builder().name(a.getName()).price(a.getPrice()).build())
                .toList() : new ArrayList<>())
            .build()).toList();
        order.setItems(new ArrayList<>(items));

        Order saved = repo.save(order);

        // Publish to RabbitMQ — notification-service consumes this
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("orderId",       saved.getId().toString());
            event.put("orderNumber",   saved.getOrderNumber());
            event.put("shopId",        shopId);
            event.put("total",         total.toString());
            event.put("subtotal",      subtotal.toString());
            event.put("gstRate",       gstRate.toString());
            event.put("customerName",  saved.getCustomerName() != null ? saved.getCustomerName() : "");
            event.put("customerPhone", saved.getCustomerPhone() != null ? saved.getCustomerPhone() : "");
            event.put("tableNumber",   saved.getTableNumber() != null ? saved.getTableNumber() : "");
            event.put("paymentMethod", saved.getPaymentMethod().name());
            if (saved.getHotelId() != null)   event.put("hotelId", saved.getHotelId().toString());
            if (saved.getRoomNumber() != null) event.put("roomNumber", saved.getRoomNumber());
            event.put("items", req.getItems().stream().map(i -> Map.of(
                "menuItemId", i.getMenuItemId() != null ? i.getMenuItemId().toString() : "",
                "itemName",   i.getItemName(),
                "quantity",   i.getQuantity(),
                "unitPrice",  i.getUnitPrice().toString()
            )).toList());
            rabbit.convertAndSend("aviqr.orders", "order.new", event);
        } catch (Exception e) { log.warn("Failed to publish order event: {}", e.getMessage()); }

        return toDto(saved);
    }

    /** Does this uid own shopId? Used for roles like SUPPLIER that manage multiple
     *  outlet shops and so have no single shopId of their own to compare against
     *  (their JWT/X-Shop-Id is empty) — falls back to false on any error, so a
     *  down shop-service fails closed rather than granting access. */
    public boolean isShopOwnedBy(String shopId, String uid) {
        if (uid == null || uid.isBlank()) return false;
        try {
            @SuppressWarnings("unchecked")
            Map<String,Object> resp = restTemplate.getForObject(shopServiceUrl + "/api/v1/shops/" + shopId, Map.class);
            if (resp != null && resp.get("data") instanceof Map<?,?> data) {
                return uid.equals(data.get("ownerId"));
            }
        } catch (Exception e) {
            log.debug("Could not verify shop ownership for shop {}: {}", shopId, e.getMessage());
        }
        return false;
    }

    /** Resolve the applicable tax rate from shop-service's tax-rule engine (region/service-type/
     *  category rules, falling back to the shop's flat taxPercent). Falls back to DEFAULT_GST (5%)
     *  on any error. */
    private BigDecimal fetchShopTaxPercent(String shopId) {
        try {
            @SuppressWarnings("unchecked")
            Map<String,Object> resp = restTemplate.getForObject(
                shopServiceUrl + "/api/v1/tax-rules/resolve/" + shopId, Map.class);
            if (resp != null && resp.get("data") instanceof Map<?,?> data) {
                Object taxPct = data.get("taxPercent");
                if (taxPct instanceof Number n && n.doubleValue() > 0) {
                    return BigDecimal.valueOf(n.doubleValue());
                }
            }
        } catch (Exception e) {
            log.debug("Could not resolve taxPercent for shop {} — using default 5%: {}", shopId, e.getMessage());
        }
        return DEFAULT_GST;
    }

    /** 6-digit code shown to the customer (as text + QR) and re-entered by counter/kitchen
     *  staff to confirm payment and, later, pickup/handover. Retries on collision against
     *  other still-active orders in the same shop. */
    private static final List<OrderStatus> TERMINAL_STATUSES =
        List.of(OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.REJECTED);

    private String generateConfirmationCode(String shopId) {
        for (int attempt = 0; attempt < 5; attempt++) {
            String code = String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));
            if (repo.findByShopIdAndConfirmationCodeAndStatusNotIn(shopId, code, TERMINAL_STATUSES).isEmpty()) {
                return code;
            }
        }
        return String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));
    }

    public Page<OrderResponse> getShopOrders(String shopId, OrderStatus status, int page, int size) {
        Pageable pg = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return (status != null
            ? repo.findByShopIdAndStatusOrderByCreatedAtDesc(shopId, status, pg)
            : repo.findByShopIdOrderByCreatedAtDesc(shopId, pg)).map(this::toDto);
    }

    public List<OrderResponse> getLiveOrders(String shopId) {
        return repo.findByShopIdAndStatusIn(shopId,
            List.of(OrderStatus.NEW, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY))
            .stream().map(this::toDto).toList();
    }

    @Transactional
    public OrderResponse updateStatus(UUID id, String status, String userId) {
        Order order = repo.findById(id).orElseThrow(() -> new RuntimeException("Order not found: " + id));
        order.setStatus(OrderStatus.valueOf(status.toUpperCase()));
        if (status.equalsIgnoreCase("ACCEPTED"))   order.setAcceptedAt(LocalDateTime.now());
        if (status.equalsIgnoreCase("COMPLETED"))  order.setCompletedAt(LocalDateTime.now());
        Order saved = repo.save(order);
        publishStatusEvent(saved, status.toUpperCase());
        return toDto(saved);
    }

    /** Read-only lookup by the code shown on the customer's confirmation screen —
     *  used by the counter/kitchen "enter or scan code" screen to preview the order
     *  before acting. Returns regardless of status so the UI can explain why a code
     *  can't be actioned (e.g. already completed). */
    public Optional<OrderResponse> lookupByCode(String shopId, String code) {
        return repo.findByShopIdAndConfirmationCode(shopId, code).map(this::toDto);
    }

    /** Counter/owner confirms a pay-at-counter order: collects payment if still pending
     *  (or simply acknowledges it if already paid some other way) and releases it to the
     *  kitchen. Only valid while the order is still awaiting this step. */
    @Transactional
    public OrderResponse confirmPayment(String shopId, String code, String staffUid) {
        Order order = repo.findByShopIdAndConfirmationCode(shopId, code)
            .orElseThrow(() -> new RuntimeException("No order found for this code"));
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) {
            throw new IllegalStateException("This order is not awaiting payment confirmation (status: " + order.getStatus() + ")");
        }
        if (order.getPaymentStatus() == PaymentStatus.PENDING) {
            order.setPaymentStatus(PaymentStatus.PAID);
        }
        order.setPaymentConfirmedAt(LocalDateTime.now());
        order.setStatus(OrderStatus.NEW);
        Order saved = repo.save(order);
        publishStatusEvent(saved, "NEW");
        return toDto(saved);
    }

    /** Same code, reused at handover: confirms the prepared order was picked up /
     *  handed to the delivery rider. Only valid once the order is READY. */
    @Transactional
    public OrderResponse confirmPickup(String shopId, String code, String staffUid) {
        Order order = repo.findByShopIdAndConfirmationCode(shopId, code)
            .orElseThrow(() -> new RuntimeException("No order found for this code"));
        if (order.getStatus() != OrderStatus.READY) {
            throw new IllegalStateException("This order is not ready for pickup (status: " + order.getStatus() + ")");
        }
        order.setStatus(OrderStatus.COMPLETED);
        order.setCompletedAt(LocalDateTime.now());
        Order saved = repo.save(order);
        publishStatusEvent(saved, "COMPLETED");
        return toDto(saved);
    }

    /** Called by payment-service once Razorpay confirms capture — releases the order to
     *  the kitchen automatically, without any counter step, for online-paid orders. */
    @Transactional
    public void syncPaymentCaptured(UUID orderId) {
        Order order = repo.findById(orderId).orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
        order.setPaymentStatus(PaymentStatus.CAPTURED);
        order.setPaymentConfirmedAt(LocalDateTime.now());
        if (order.getStatus() == OrderStatus.PENDING_PAYMENT) {
            order.setStatus(OrderStatus.NEW);
        }
        Order saved = repo.save(order);
        publishStatusEvent(saved, saved.getStatus().name());
    }

    private void publishStatusEvent(Order saved, String status) {
        try {
            rabbit.convertAndSend("aviqr.orders", "order.status", Map.of(
                "orderId",       saved.getId().toString(),
                "orderNumber",   saved.getOrderNumber(),
                "shopId",        saved.getShopId(),
                "status",        status,
                "customerPhone", saved.getCustomerPhone() != null ? saved.getCustomerPhone() : "",
                "customerName",  saved.getCustomerName() != null ? saved.getCustomerName() : "",
                "tableNumber",   saved.getTableNumber() != null ? saved.getTableNumber() : ""
            ));
        } catch (Exception e) { log.warn("Failed to publish status event: {}", e.getMessage()); }
    }

    public Page<OrderResponse> getCustomerOrders(String customerId, int page, int size) {
        Pageable pg = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return repo.findByCustomerIdOrderByCreatedAtDesc(customerId, pg).map(this::toDto);
    }

    public Optional<OrderResponse> getById(UUID id) {
        return repo.findById(id).map(this::toDto);
    }

    // Anonymous "track my order" lookup — requires BOTH orderNumber and the
    // exact phone number used at checkout to match. Returns empty (→ 404,
    // never a distinguishable 403) on any mismatch so this can't be used to
    // enumerate whether a given order number exists.
    public Optional<OrderResponse> lookupPublic(String orderNumber, String phone) {
        if (orderNumber == null || phone == null) return Optional.empty();
        return repo.findByOrderNumber(orderNumber.trim())
            .filter(o -> phone.trim().equals(o.getCustomerPhone()))
            .map(this::toDto);
    }

    public Page<OrderResponse> listAll(int page, int size) {
        Pageable pg = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return repo.findAll(pg).map(this::toDto);
    }

    public OrderResponse toDto(Order o) {
        return OrderResponse.builder()
            .id(o.getId()).orderNumber(o.getOrderNumber()).shopId(o.getShopId())
            .customerId(o.getCustomerId()).customerName(o.getCustomerName())
            .customerPhone(o.getCustomerPhone()).tableNumber(o.getTableNumber())
            .hotelId(o.getHotelId()).roomNumber(o.getRoomNumber())
            .type(o.getType()).status(o.getStatus()).paymentMethod(o.getPaymentMethod())
            .paymentStatus(o.getPaymentStatus()).subtotal(o.getSubtotal())
            .discount(o.getDiscount()).serviceCharge(o.getServiceCharge())
            .tax(o.getTax()).totalAmount(o.getTotalAmount()).notes(o.getNotes())
            .confirmationCode(o.getConfirmationCode()).paymentConfirmedAt(o.getPaymentConfirmedAt())
            .items(o.getItems() != null ? o.getItems().stream().map(i ->
                OrderResponse.ItemDto.builder().id(i.getId()).menuItemId(i.getMenuItemId())
                    .itemName(i.getItemName()).variantName(i.getVariantName()).quantity(i.getQuantity())
                    .unitPrice(i.getUnitPrice()).totalPrice(i.getTotalPrice()).notes(i.getNotes())
                    .addons(i.getAddons() != null ? i.getAddons().stream()
                        .map(a -> OrderResponse.AddonDto.builder().name(a.getName()).price(a.getPrice()).build())
                        .toList() : List.of())
                    .build()
            ).toList() : List.of())
            .createdAt(o.getCreatedAt()).updatedAt(o.getUpdatedAt())
            .acceptedAt(o.getAcceptedAt()).completedAt(o.getCompletedAt())
            .build();
    }
}
