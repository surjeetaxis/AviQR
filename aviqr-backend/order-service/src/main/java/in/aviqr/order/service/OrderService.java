package in.aviqr.order.service;
import in.aviqr.order.dto.*;
import in.aviqr.order.entity.*;
import in.aviqr.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j
public class OrderService {
    private final OrderRepository repo;
    private final RabbitTemplate rabbit;

    @Transactional
    public OrderResponse create(String shopId, String customerId, CreateOrderRequest req) {
        BigDecimal subtotal = req.getItems().stream()
            .map(i -> i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal tax = subtotal.multiply(BigDecimal.valueOf(0.05)); // 5% GST
        BigDecimal total = subtotal.add(tax);

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

        // Notify shop via RabbitMQ
        try {
            rabbit.convertAndSend("aviqr.orders", "order.new",
                Map.of("orderId", saved.getId().toString(), "shopId", shopId, "total", total.toString()));
        } catch (Exception e) { log.warn("Failed to publish order event: {}", e.getMessage()); }

        return toDto(saved);
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
        Order order = repo.findById(id).orElseThrow(() -> new RuntimeException("Order not found"));
        order.setStatus(OrderStatus.valueOf(status.toUpperCase()));
        if (status.equalsIgnoreCase("ACCEPTED"))   order.setAcceptedAt(LocalDateTime.now());
        if (status.equalsIgnoreCase("COMPLETED"))  order.setCompletedAt(LocalDateTime.now());
        return toDto(repo.save(order));
    }

    public Page<OrderResponse> getCustomerOrders(String customerId, int page, int size) {
        return repo.findByCustomerIdOrderByCreatedAtDesc(customerId, PageRequest.of(page, size)).map(this::toDto);
    }

    public Optional<OrderResponse> getById(UUID id) { return repo.findById(id).map(this::toDto); }

    private OrderResponse toDto(Order o) {
        OrderResponse r = new OrderResponse();
        r.setId(o.getId()); r.setOrderNumber(o.getOrderNumber()); r.setShopId(o.getShopId());
        r.setCustomerName(o.getCustomerName()); r.setCustomerPhone(o.getCustomerPhone());
        r.setTableNumber(o.getTableNumber()); r.setType(o.getType()); r.setStatus(o.getStatus());
        r.setPaymentMethod(o.getPaymentMethod()); r.setPaymentStatus(o.getPaymentStatus());
        r.setSubtotal(o.getSubtotal()); r.setTax(o.getTax()); r.setTotalAmount(o.getTotalAmount());
        r.setNotes(o.getNotes()); r.setCreatedAt(o.getCreatedAt()); r.setUpdatedAt(o.getUpdatedAt());
        r.setItems(o.getItems().stream().map(i -> {
            OrderResponse.ItemDto d = new OrderResponse.ItemDto();
            d.setId(i.getId()); d.setMenuItemId(i.getMenuItemId()); d.setItemName(i.getItemName());
            d.setQuantity(i.getQuantity()); d.setUnitPrice(i.getUnitPrice());
            d.setTotalPrice(i.getTotalPrice()); d.setNotes(i.getNotes());
            return d;
        }).toList());
        return r;
    }
}