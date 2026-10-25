package in.aviqr.order;

import in.aviqr.order.dto.CreateOrderRequest;
import in.aviqr.order.entity.Order;
import in.aviqr.order.entity.OrderStatus;
import in.aviqr.order.entity.PaymentMethod;
import in.aviqr.order.repository.OrderRepository;
import in.aviqr.order.service.OrderService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.net.URI;
import java.util.*;

import static in.aviqr.order.entity.OrderStatus.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Security rules in OrderService: status transitions and room-charge eligibility. */
@ExtendWith(MockitoExtension.class)
class OrderSecurityRulesTest {

    @Mock OrderRepository repo;
    @Mock RabbitTemplate rabbit;
    @Mock RestTemplate restTemplate;
    @Mock in.aviqr.order.service.MenuPricingClient menuPricing;
    @InjectMocks OrderService service;

    private Order order(OrderStatus status) {
        return Order.builder().id(UUID.randomUUID()).orderNumber("ORD-SEC").shopId("shop-101")
            .customerName("Guest").status(status).paymentMethod(PaymentMethod.CASH)
            .subtotal(BigDecimal.TEN).totalAmount(BigDecimal.TEN).items(new ArrayList<>()).build();
    }

    // ── Status transitions ──────────────────────────────────────────────────

    @Test @DisplayName("an unpaid order cannot be released to the kitchen through a status update")
    void pendingPaymentCannotBecomeNew() {
        var o = order(PENDING_PAYMENT);
        when(repo.findById(o.getId())).thenReturn(Optional.of(o));
        assertThatThrownBy(() -> service.updateStatus(o.getId(), "NEW", "staff-1"))
            .isInstanceOf(IllegalStateException.class);
        verify(repo, never()).save(any());
    }

    @Test @DisplayName("a finished order cannot be reopened")
    void completedCannotBeReopened() {
        var o = order(COMPLETED);
        when(repo.findById(o.getId())).thenReturn(Optional.of(o));
        assertThatThrownBy(() -> service.updateStatus(o.getId(), "PREPARING", "staff-1"))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test @DisplayName("a forward step is saved")
    void forwardStepIsSaved() {
        var o = order(NEW);
        when(repo.findById(o.getId())).thenReturn(Optional.of(o));
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
        assertThat(service.updateStatus(o.getId(), "ACCEPTED", "staff-1").getStatus()).isEqualTo(ACCEPTED);
    }

    @Test @DisplayName("repeating the current status is a no-op, not an error")
    void sameStatusIsNoOp() {
        var o = order(PREPARING);
        when(repo.findById(o.getId())).thenReturn(Optional.of(o));
        assertThat(service.updateStatus(o.getId(), "PREPARING", "staff-1").getStatus()).isEqualTo(PREPARING);
        verify(repo, never()).save(any());
    }

    @Test @DisplayName("an unknown status is rejected")
    void unknownStatusRejected() {
        var o = order(NEW);
        when(repo.findById(o.getId())).thenReturn(Optional.of(o));
        assertThatThrownBy(() -> service.updateStatus(o.getId(), "PAID", "staff-1"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test @DisplayName("transition table")
    void transitionTable() {
        assertThat(OrderService.isAllowedTransition(NEW, ACCEPTED)).isTrue();
        assertThat(OrderService.isAllowedTransition(NEW, COMPLETED)).isTrue();      // KOT "done" shortcut
        assertThat(OrderService.isAllowedTransition(READY, COMPLETED)).isTrue();
        assertThat(OrderService.isAllowedTransition(PREPARING, CANCELLED)).isTrue();
        assertThat(OrderService.isAllowedTransition(PENDING_PAYMENT, CANCELLED)).isTrue();
        assertThat(OrderService.isAllowedTransition(PENDING_PAYMENT, REJECTED)).isTrue();
        assertThat(OrderService.isAllowedTransition(PENDING_PAYMENT, NEW)).isFalse();
        assertThat(OrderService.isAllowedTransition(PENDING_PAYMENT, ACCEPTED)).isFalse();
        assertThat(OrderService.isAllowedTransition(READY, ACCEPTED)).isFalse();
        assertThat(OrderService.isAllowedTransition(NEW, PENDING_PAYMENT)).isFalse();
        assertThat(OrderService.isAllowedTransition(PREPARING, REJECTED)).isFalse();
        assertThat(OrderService.isAllowedTransition(CANCELLED, NEW)).isFalse();
        assertThat(OrderService.isAllowedTransition(REJECTED, CANCELLED)).isFalse();
    }

    // ── Room charge ─────────────────────────────────────────────────────────

    private CreateOrderRequest roomChargeRequest() {
        var item = new CreateOrderRequest.OrderItemRequest();
        item.setItemName("Club Sandwich");
        item.setUnitPrice(BigDecimal.valueOf(300));
        item.setQuantity(1);
        item.setMenuItemId(UUID.randomUUID());
        var r = new CreateOrderRequest();
        r.setCustomerName("Guest");
        r.setPaymentMethod("ROOM_CHARGE");
        r.setType("DINE_IN");
        r.setHotelId(UUID.randomUUID());
        r.setRoomNumber("204");
        r.setItems(List.of(item));
        return r;
    }

    @Test @DisplayName("room charge is refused when hotel-service says the room is not eligible")
    void roomChargeRefusedWhenNotEligible() {
        ReflectionTestUtils.setField(service, "hotelServiceUrl", "http://hotel-service");
        when(restTemplate.getForObject(any(URI.class), eq(Map.class))).thenReturn(Map.of("allowed", false));
        assertThatThrownBy(() -> service.create("shop-101", "cust-1", roomChargeRequest(), true))
            .isInstanceOf(IllegalArgumentException.class);
        verify(repo, never()).save(any());
    }

    @Test @DisplayName("room charge fails closed when hotel-service is unreachable")
    void roomChargeFailsClosed() {
        ReflectionTestUtils.setField(service, "hotelServiceUrl", "http://hotel-service");
        when(restTemplate.getForObject(any(URI.class), eq(Map.class))).thenThrow(new ResourceAccessException("down"));
        assertThatThrownBy(() -> service.create("shop-101", "cust-1", roomChargeRequest(), true))
            .isInstanceOf(IllegalArgumentException.class);
        verify(repo, never()).save(any());
    }

    @Test @DisplayName("room charge is accepted when the room is eligible, and the check names this shop and room")
    void roomChargeAcceptedWhenEligible() {
        ReflectionTestUtils.setField(service, "hotelServiceUrl", "http://hotel-service");
        var req = roomChargeRequest();
        when(restTemplate.getForObject(any(URI.class), eq(Map.class))).thenReturn(Map.of("allowed", true));
        when(repo.save(any())).thenAnswer(i -> { Order o = i.getArgument(0); o.setId(UUID.randomUUID()); return o; });

        assertThat(service.create("shop-101", "cust-1", req, true).getStatus()).isEqualTo(NEW);

        var uri = ArgumentCaptor.forClass(URI.class);
        verify(restTemplate).getForObject(uri.capture(), eq(Map.class));
        assertThat(uri.getValue().toString())
            .contains("/api/v1/hotels/internal/" + req.getHotelId() + "/room-charge-eligibility")
            .contains("shopId=shop-101").contains("roomNumber=204");
    }
}
