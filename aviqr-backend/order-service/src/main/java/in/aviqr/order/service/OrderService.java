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

@Service @RequiredArgsConstructor @Slf4j
public class OrderService {
    private final OrderRepository repo;
    private final RabbitTemplate rabbit;

    /** Default GST slab — used when shop-service cannot be reached */
    private static final BigDecimal DEFAULT_GST = BigDecimal.valueOf(5.0);

    @Value("${shop.service.url:http://shop-service}")
    private String shopServiceUrl;

    @Transactional
    public OrderResponse create(String shopId, String customerId, CreateOrderRequest req) {
        BigDecimal subtotal = req.getItems().stream()
            .map(i -> i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // ── Fetch per-shop GST rate from shop-service ────────────────────────
        BigDecimal gstRate = fetchShopTaxPercent(shopId);
        BigDecimal tax   = subtotal.multiply(gstRate)
                                   .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal total = subtotal.add(tax);
        // ────────────────────────────────────────────────────────────────────

        Order order = Order.builder()
            .orderNumber("ORD-" + System.currentTimeMillis())
            .shopId(shopId)
            .customerId(customerId)
            .customerName(req.getCustomerName())
            .customerPhone(req.getCustomerPhone())
            .tableNumber(req.getTableNumber())
            .type(req.getType() != null ? OrderType.valueOf(req.getType().toUpperCase()) : OrderType.DINE_IN)
            .paymentMethod(PaymentMethod.valueOf(req.getPaymentMethod().toUpperCase()))
            .subtotal(subtotal).tax(tax).totalAmount(total)
            .notes(req.getNotes())
            .build();

        List<OrderItem> items = req.getItems().stream().map(i -> OrderItem.builder()
            .order(order)
            .menuItemId(i.getMenuItemId())
            .itemName(i.getItemName())
            .quantity(i.getQuantity())
            .unitPrice(i.getUnitPrice())
            .totalPrice(i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
            .notes(i.getNotes())
            .build()).toList();
        order.setItems(new ArrayList<>(items));

        Order saved = repo.save(order);

        // Publish to RabbitMQ — notification-service consumes this
        try {
            rabbit.convertAndSend("aviqr.orders", "order.new", Map.of(
                "orderId",       saved.getId().toString(),
                "orderNumber",   saved.getOrderNumber(),
                "shopId",        shopId,
                "total",         total.toString(),
                "subtotal",      subtotal.toString(),
                "gstRate",       gstRate.toString(),
                "customerName",  saved.getCustomerName() != null ? saved.getCustomerName() : "",
                "customerPhone", saved.getCustomerPhone() != null ? saved.getCustomerPhone() : "",
                "tableNumber",   saved.getTableNumber() != null ? saved.getTableNumber() : "",
                "items",         req.getItems().stream().map(i -> Map.of(
                    "menuItemId", i.getMenuItemId() != null ? i.getMenuItemId().toString() : "",
                    "itemName",   i.getItemName(),
                    "quantity",   i.getQuantity(),
                    "unitPrice",  i.getUnitPrice().toString()
                )).toList()
            ));
        } catch (Exception e) { log.warn("Failed to publish order event: {}", e.getMessage()); }

        return toDto(saved);
    }

    /** Fetch taxPercent from shop-service settings endpoint.
     *  Falls back to DEFAULT_GST (5%) on any error. */
    private BigDecimal fetchShopTaxPercent(String shopId) {
        try {
            RestTemplate rt = new RestTemplate();
            @SuppressWarnings("unchecked")
            Map<String,Object> resp = rt.getForObject(
                shopServiceUrl + "/api/v1/settings/shop/" + shopId, Map.class);
            if (resp != null && resp.get("data") instanceof Map<?,?> data) {
                Object taxPct = data.get("taxPercent");
                if (taxPct instanceof Number n && n.doubleValue() > 0) {
                    return BigDecimal.valueOf(n.doubleValue());
                }
            }
        } catch (Exception e) {
            log.debug("Could not fetch taxPercent for shop {} — using default 5%: {}", shopId, e.getMessage());
        }
        return DEFAULT_GST;
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

        // Publish status change event for READY notification
        try {
            rabbit.convertAndSend("aviqr.orders", "order.status", Map.of(
                "orderId",       saved.getId().toString(),
                "orderNumber",   saved.getOrderNumber(),
                "shopId",        saved.getShopId(),
                "status",        status.toUpperCase(),
                "customerPhone", saved.getCustomerPhone() != null ? saved.getCustomerPhone() : "",
                "customerName",  saved.getCustomerName() != null ? saved.getCustomerName() : "",
                "tableNumber",   saved.getTableNumber() != null ? saved.getTableNumber() : ""
            ));
        } catch (Exception e) { log.warn("Failed to publish status event: {}", e.getMessage()); }

        return toDto(saved);
    }

    public Page<OrderResponse> getCustomerOrders(String customerId, int page, int size) {
        Pageable pg = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return repo.findByCustomerIdOrderByCreatedAtDesc(customerId, pg).map(this::toDto);
    }

    public Optional<OrderResponse> getById(UUID id) {
        return repo.findById(id).map(this::toDto);
    }

    public Page<OrderResponse> listAll(int page, int size) {
        Pageable pg = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return repo.findAll(pg).map(this::toDto);
    }

    private OrderResponse toDto(Order o) {
        return OrderResponse.builder()
            .id(o.getId()).orderNumber(o.getOrderNumber()).shopId(o.getShopId())
            .customerId(o.getCustomerId()).customerName(o.getCustomerName())
            .customerPhone(o.getCustomerPhone()).tableNumber(o.getTableNumber())
            .type(o.getType()).status(o.getStatus()).paymentMethod(o.getPaymentMethod())
            .paymentStatus(o.getPaymentStatus()).subtotal(o.getSubtotal())
            .tax(o.getTax()).totalAmount(o.getTotalAmount()).notes(o.getNotes())
            .items(o.getItems() != null ? o.getItems().stream().map(i ->
                OrderResponse.ItemDto.builder().id(i.getId()).menuItemId(i.getMenuItemId())
                    .itemName(i.getItemName()).quantity(i.getQuantity())
                    .unitPrice(i.getUnitPrice()).totalPrice(i.getTotalPrice()).notes(i.getNotes()).build()
            ).toList() : List.of())
            .createdAt(o.getCreatedAt()).updatedAt(o.getUpdatedAt())
            .acceptedAt(o.getAcceptedAt()).completedAt(o.getCompletedAt())
            .build();
    }
}
