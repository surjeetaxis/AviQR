package in.aviqr.order.service;
import in.aviqr.order.dto.BillResponse;
import in.aviqr.order.entity.*;
import in.aviqr.order.repository.BillRepository;
import in.aviqr.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;

@Service @RequiredArgsConstructor @Slf4j
public class BillService {
    private final BillRepository billRepo;
    private final OrderRepository orderRepo;
    private final OrderService orderService;
    private final RabbitTemplate rabbit;

    /** Orders in these statuses are either already dead (cancelled/rejected) or not yet
     *  paid-for-and-confirmed (still awaiting the pay-at-counter/online gate), so they're
     *  excluded from being folded into a bill. */
    private static final List<OrderStatus> NOT_BILLABLE =
        List.of(OrderStatus.CANCELLED, OrderStatus.REJECTED, OrderStatus.PENDING_PAYMENT);

    @Transactional
    public BillResponse generate(String shopId, String tableNumber, String uid, boolean isStaff) {
        if (billRepo.findByShopIdAndTableNumberAndStatus(shopId, tableNumber, BillStatus.OPEN).isPresent()) {
            throw new IllegalStateException("An open bill already exists for table " + tableNumber);
        }
        List<Order> eligible = orderRepo.findByShopIdAndTableNumberAndBillIdIsNullAndStatusNotIn(
            shopId, tableNumber, NOT_BILLABLE);
        if (eligible.isEmpty()) {
            throw new IllegalStateException("No unbilled orders found for table " + tableNumber);
        }
        // A customer (not shop staff) may only bill a table where every unbilled order is their own —
        // otherwise they could generate a bill covering another diner's items at a shared table.
        if (!isStaff && eligible.stream().anyMatch(o -> !uid.equals(o.getCustomerId()))) {
            throw new IllegalStateException("Cannot bill orders that are not yours");
        }

        Bill bill = Bill.builder()
            .shopId(shopId).tableNumber(tableNumber)
            .subtotal(sum(eligible, Order::getSubtotal))
            .discount(sum(eligible, Order::getDiscount))
            .serviceCharge(sum(eligible, Order::getServiceCharge))
            .tax(sum(eligible, Order::getTax))
            .totalAmount(sum(eligible, Order::getTotalAmount))
            .generatedBy(uid)
            .build();
        Bill saved = billRepo.save(bill);

        eligible.forEach(o -> o.setBillId(saved.getId()));
        orderRepo.saveAll(eligible);

        return toDto(saved, eligible);
    }

    public Optional<BillResponse> getCurrent(String shopId, String tableNumber) {
        return billRepo.findByShopIdAndTableNumberAndStatus(shopId, tableNumber, BillStatus.OPEN)
            .map(b -> toDto(b, orderRepo.findByBillId(b.getId())));
    }

    public List<BillResponse> getOpenBills(String shopId) {
        return billRepo.findByShopIdAndStatus(shopId, BillStatus.OPEN).stream()
            .map(b -> toDto(b, orderRepo.findByBillId(b.getId())))
            .toList();
    }

    public Optional<BillResponse> getById(UUID id) {
        return billRepo.findById(id).map(b -> toDto(b, orderRepo.findByBillId(b.getId())));
    }

    public Optional<Bill> getEntity(UUID id) {
        return billRepo.findById(id);
    }

    /** Staff confirms a cash/manual settlement at the table. */
    @Transactional
    public BillResponse settle(UUID id, String uid) {
        Bill bill = billRepo.findById(id).orElseThrow(() -> new RuntimeException("Bill not found: " + id));
        if (bill.getStatus() == BillStatus.PAID) {
            throw new IllegalStateException("Bill is already settled");
        }
        markPaid(bill, PaymentMethod.CASH, uid);
        List<Order> orders = orderRepo.findByBillId(id);
        markOrdersPaid(orders, PaymentStatus.CASH);
        publishSettled(bill, orders);
        return toDto(bill, orders);
    }

    /** Called by payment-service once Razorpay confirms capture for this bill's Razorpay order. */
    @Transactional
    public void syncPaymentCaptured(UUID id) {
        Bill bill = billRepo.findById(id).orElseThrow(() -> new RuntimeException("Bill not found: " + id));
        if (bill.getStatus() == BillStatus.PAID) return; // idempotent — webhook + verify can both fire
        markPaid(bill, PaymentMethod.ONLINE, null);
        List<Order> orders = orderRepo.findByBillId(id);
        markOrdersPaid(orders, PaymentStatus.CAPTURED);
        publishSettled(bill, orders);
    }

    private void markPaid(Bill bill, PaymentMethod method, String settledBy) {
        bill.setStatus(BillStatus.PAID);
        bill.setPaymentMethod(method);
        bill.setPaidAt(LocalDateTime.now());
        bill.setSettledBy(settledBy);
        billRepo.save(bill);
    }

    private void markOrdersPaid(List<Order> orders, PaymentStatus status) {
        orders.forEach(o -> {
            if (o.getPaymentStatus() != PaymentStatus.PAID && o.getPaymentStatus() != PaymentStatus.CAPTURED) {
                o.setPaymentStatus(status);
                o.setPaymentConfirmedAt(LocalDateTime.now());
            }
        });
        orderRepo.saveAll(orders);
    }

    /** Reuses the order.new/order.status channel (aviqr.orders topic exchange) — the Kanban
     *  board's existing 15s poll of /shop/{shopId}/live already reflects paymentStatus, so
     *  this event exists for any future consumer that wants to react to settlement specifically. */
    private void publishSettled(Bill bill, List<Order> orders) {
        try {
            rabbit.convertAndSend("aviqr.orders", "order.bill.settled", Map.of(
                "billId",       bill.getId().toString(),
                "shopId",       bill.getShopId(),
                "tableNumber",  bill.getTableNumber(),
                "totalAmount",  bill.getTotalAmount().toString(),
                "paymentMethod", bill.getPaymentMethod() != null ? bill.getPaymentMethod().name() : "",
                "orderIds",     orders.stream().map(o -> o.getId().toString()).toList()
            ));
        } catch (Exception e) { log.warn("Failed to publish bill.settled event: {}", e.getMessage()); }
    }

    private BigDecimal sum(List<Order> orders, Function<Order, BigDecimal> f) {
        return orders.stream().map(f).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BillResponse toDto(Bill b, List<Order> orders) {
        return BillResponse.builder()
            .id(b.getId()).shopId(b.getShopId()).tableNumber(b.getTableNumber()).status(b.getStatus())
            .subtotal(b.getSubtotal()).discount(b.getDiscount()).serviceCharge(b.getServiceCharge())
            .tax(b.getTax()).totalAmount(b.getTotalAmount()).paymentMethod(b.getPaymentMethod())
            .createdAt(b.getCreatedAt()).generatedBy(b.getGeneratedBy())
            .paidAt(b.getPaidAt()).settledBy(b.getSettledBy())
            .orders(orders.stream().map(orderService::toDto).toList())
            .build();
    }
}
