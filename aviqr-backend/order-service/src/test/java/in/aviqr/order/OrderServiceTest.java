package in.aviqr.order;

import in.aviqr.order.dto.CreateOrderRequest;
import in.aviqr.order.dto.OrderResponse;
import in.aviqr.order.entity.*;
import in.aviqr.order.repository.OrderRepository;
import in.aviqr.order.service.OrderService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.*;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock OrderRepository repo;
    @Mock RabbitTemplate rabbit;
    @InjectMocks OrderService service;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private CreateOrderRequest.ItemRequest item(String name, double price, int qty) {
        var it = new CreateOrderRequest.ItemRequest();
        it.setItemName(name);
        it.setUnitPrice(BigDecimal.valueOf(price));
        it.setQuantity(qty);
        it.setMenuItemId(UUID.randomUUID());
        return it;
    }

    private CreateOrderRequest req(CreateOrderRequest.ItemRequest... items) {
        var r = new CreateOrderRequest();
        r.setCustomerName("Test Customer");
        r.setPaymentMethod("ONLINE");
        r.setType("DINE_IN");
        r.setItems(List.of(items));
        return r;
    }

    private Order savedOrder(CreateOrderRequest r, BigDecimal subtotal, BigDecimal tax) {
        var o = Order.builder()
                .id(UUID.randomUUID())
                .orderNumber("ORD-TEST")
                .shopId("shop-101")
                .customerName(r.getCustomerName())
                .type(OrderType.DINE_IN)
                .status(OrderStatus.NEW)
                .paymentMethod(PaymentMethod.ONLINE)
                .paymentStatus(PaymentStatus.PENDING)
                .subtotal(subtotal)
                .tax(tax)
                .totalAmount(subtotal.add(tax))
                .items(new ArrayList<>())
                .build();
        when(repo.save(any(Order.class))).thenReturn(o);
        return o;
    }

    // ── create() ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("create: single item — subtotal, 5% tax and total computed correctly")
    void create_singleItem_correctTotals() {
        var r = req(item("Butter Chicken", 380.0, 1));
        var expected = new BigDecimal("380.00");
        var tax      = new BigDecimal("19.00");
        savedOrder(r, expected, tax);

        OrderResponse resp = service.create("shop-101", null, r);

        assertThat(resp.getSubtotal()).isEqualByComparingTo("380.00");
        assertThat(resp.getTax()).isEqualByComparingTo("19.00");
        assertThat(resp.getTotalAmount()).isEqualByComparingTo("399.00");
    }

    @Test
    @DisplayName("create: multiple items — subtotal is the sum of all line totals")
    void create_multipleItems_subtotalSumsCorrectly() {
        var r = req(item("Paneer Tikka", 280.0, 2), item("Butter Naan", 55.0, 3));
        // 280*2 + 55*3 = 560 + 165 = 725
        var subtotal = new BigDecimal("725.00");
        var tax      = new BigDecimal("36.25");
        savedOrder(r, subtotal, tax);

        OrderResponse resp = service.create("shop-101", null, r);

        assertThat(resp.getSubtotal()).isEqualByComparingTo("725.00");
    }

    @Test
    @DisplayName("create: RabbitMQ failure does not abort order persistence")
    void create_rabbitFailure_orderStillSaved() {
        var r = req(item("Dal Makhani", 280.0, 1));
        savedOrder(r, new BigDecimal("280.00"), new BigDecimal("14.00"));
        doThrow(new RuntimeException("AMQP down")).when(rabbit)
                .convertAndSend(anyString(), anyString(), any(Object.class));

        // Must not throw — rabbit failure is swallowed
        assertThatCode(() -> service.create("shop-101", null, r)).doesNotThrowAnyException();
        verify(repo).save(any(Order.class));
    }

    @Test
    @DisplayName("create: customerId is propagated to the saved order")
    void create_withCustomerId_propagated() {
        var r = req(item("Gulab Jamun", 90.0, 1));
        var o = Order.builder().id(UUID.randomUUID()).orderNumber("ORD-X").shopId("shop-101")
                .customerId("cust-42").customerName("Test").type(OrderType.DINE_IN)
                .status(OrderStatus.NEW).paymentMethod(PaymentMethod.ONLINE).paymentStatus(PaymentStatus.PENDING)
                .subtotal(new BigDecimal("90.00")).tax(new BigDecimal("4.50"))
                .totalAmount(new BigDecimal("94.50")).items(new ArrayList<>()).build();
        when(repo.save(any(Order.class))).thenReturn(o);

        OrderResponse resp = service.create("shop-101", "cust-42", r);
        assertThat(resp.getCustomerId()).isEqualTo("cust-42");
    }

    // ── getLiveOrders() ───────────────────────────────────────────────────────

    @Test
    @DisplayName("getLiveOrders: only NEW/ACCEPTED/PREPARING/READY statuses returned")
    void getLiveOrders_returnsOnlyActiveStatuses() {
        var active = List.of(
                Order.builder().id(UUID.randomUUID()).orderNumber("O1").shopId("s1")
                        .customerName("A").status(OrderStatus.NEW).type(OrderType.DINE_IN)
                        .paymentMethod(PaymentMethod.CASH).paymentStatus(PaymentStatus.PENDING)
                        .subtotal(BigDecimal.TEN).tax(BigDecimal.ZERO).totalAmount(BigDecimal.TEN)
                        .items(List.of()).build(),
                Order.builder().id(UUID.randomUUID()).orderNumber("O2").shopId("s1")
                        .customerName("B").status(OrderStatus.PREPARING).type(OrderType.DINE_IN)
                        .paymentMethod(PaymentMethod.ONLINE).paymentStatus(PaymentStatus.PAID)
                        .subtotal(BigDecimal.TEN).tax(BigDecimal.ZERO).totalAmount(BigDecimal.TEN)
                        .items(List.of()).build()
        );
        when(repo.findByShopIdAndStatusIn(eq("s1"), anyList())).thenReturn(active);

        var result = service.getLiveOrders("s1");
        assertThat(result).hasSize(2);
        assertThat(result).extracting(OrderResponse::getStatus)
                .containsOnly(OrderStatus.NEW, OrderStatus.PREPARING);
    }

    @Test
    @DisplayName("getLiveOrders: empty shop returns empty list")
    void getLiveOrders_emptyShop_emptyList() {
        when(repo.findByShopIdAndStatusIn(any(), any())).thenReturn(List.of());
        assertThat(service.getLiveOrders("shop-empty")).isEmpty();
    }

    // ── updateStatus() ────────────────────────────────────────────────────────

    @Test
    @DisplayName("updateStatus: advancing to ACCEPTED sets acceptedAt timestamp")
    void updateStatus_toAccepted_setsAcceptedAt() {
        var id = UUID.randomUUID();
        var order = Order.builder().id(id).orderNumber("O3").shopId("s1").customerName("C")
                .status(OrderStatus.NEW).type(OrderType.DINE_IN)
                .paymentMethod(PaymentMethod.CASH).paymentStatus(PaymentStatus.PENDING)
                .subtotal(BigDecimal.TEN).tax(BigDecimal.ZERO).totalAmount(BigDecimal.TEN)
                .items(new ArrayList<>()).build();
        when(repo.findById(id)).thenReturn(Optional.of(order));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.updateStatus(id, "ACCEPTED", "user-1");

        assertThat(order.getAcceptedAt()).isNotNull();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.ACCEPTED);
    }

    @Test
    @DisplayName("updateStatus: advancing to COMPLETED sets completedAt timestamp")
    void updateStatus_toCompleted_setsCompletedAt() {
        var id = UUID.randomUUID();
        var order = Order.builder().id(id).orderNumber("O4").shopId("s1").customerName("D")
                .status(OrderStatus.READY).type(OrderType.DINE_IN)
                .paymentMethod(PaymentMethod.ONLINE).paymentStatus(PaymentStatus.PAID)
                .subtotal(BigDecimal.TEN).tax(BigDecimal.ZERO).totalAmount(BigDecimal.TEN)
                .items(new ArrayList<>()).build();
        when(repo.findById(id)).thenReturn(Optional.of(order));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.updateStatus(id, "COMPLETED", "user-1");

        assertThat(order.getCompletedAt()).isNotNull();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
    }

    @Test
    @DisplayName("updateStatus: unknown order ID throws RuntimeException")
    void updateStatus_unknownId_throwsRuntimeException() {
        when(repo.findById(any())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.updateStatus(UUID.randomUUID(), "ACCEPTED", "u"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Order not found");
    }

    @Test
    @DisplayName("updateStatus: invalid status string throws IllegalArgumentException")
    void updateStatus_invalidStatus_throwsIllegalArgument() {
        var id = UUID.randomUUID();
        var order = Order.builder().id(id).orderNumber("O5").shopId("s1").customerName("E")
                .status(OrderStatus.NEW).type(OrderType.DINE_IN)
                .paymentMethod(PaymentMethod.CASH).paymentStatus(PaymentStatus.PENDING)
                .subtotal(BigDecimal.TEN).tax(BigDecimal.ZERO).totalAmount(BigDecimal.TEN)
                .items(new ArrayList<>()).build();
        when(repo.findById(id)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.updateStatus(id, "FLYING", "u"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("updateStatus: rabbit failure does not abort status save")
    void updateStatus_rabbitFailure_statusStillPersisted() {
        var id = UUID.randomUUID();
        var order = Order.builder().id(id).orderNumber("O6").shopId("s1").customerName("F")
                .status(OrderStatus.NEW).type(OrderType.DINE_IN)
                .paymentMethod(PaymentMethod.CASH).paymentStatus(PaymentStatus.PENDING)
                .subtotal(BigDecimal.TEN).tax(BigDecimal.ZERO).totalAmount(BigDecimal.TEN)
                .items(new ArrayList<>()).build();
        when(repo.findById(id)).thenReturn(Optional.of(order));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        doThrow(new RuntimeException("AMQP down")).when(rabbit)
                .convertAndSend(anyString(), anyString(), any(Object.class));

        assertThatCode(() -> service.updateStatus(id, "ACCEPTED", "u")).doesNotThrowAnyException();
        verify(repo).save(any(Order.class));
    }

    // ── getById() ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("getById: existing order returns Optional with DTO")
    void getById_existing_returnsDto() {
        var id = UUID.randomUUID();
        var order = Order.builder().id(id).orderNumber("O7").shopId("s1").customerName("G")
                .status(OrderStatus.NEW).type(OrderType.DINE_IN)
                .paymentMethod(PaymentMethod.CASH).paymentStatus(PaymentStatus.PENDING)
                .subtotal(BigDecimal.TEN).tax(BigDecimal.ZERO).totalAmount(BigDecimal.TEN)
                .items(List.of()).build();
        when(repo.findById(id)).thenReturn(Optional.of(order));

        var result = service.getById(id);
        assertThat(result).isPresent();
        assertThat(result.get().getOrderNumber()).isEqualTo("O7");
    }

    @Test
    @DisplayName("getById: missing order returns empty Optional")
    void getById_missing_returnsEmpty() {
        when(repo.findById(any())).thenReturn(Optional.empty());
        assertThat(service.getById(UUID.randomUUID())).isEmpty();
    }
}
