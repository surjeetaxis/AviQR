package in.aviqr.order;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.aviqr.order.dto.*;
import in.aviqr.order.entity.*;
import in.aviqr.order.service.OrderService;
import org.junit.jupiter.api.*;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// ── NOTE: SecurityConfig is excluded here; tests focus purely on controller logic.
// Integration with real security is covered by the auth-service security tests.
@WebMvcTest(controllers = in.aviqr.order.controller.OrderController.class,
            excludeAutoConfiguration = {
                org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class,
                org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration.class
            })
class OrderControllerTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @MockBean  OrderService orderService;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private OrderResponse sampleResponse() {
        return OrderResponse.builder()
                .id(UUID.randomUUID())
                .orderNumber("ORD-CTRL-1")
                .shopId("shop-101")
                .customerName("Test User")
                .type(OrderType.DINE_IN)
                .status(OrderStatus.NEW)
                .paymentMethod(PaymentMethod.ONLINE)
                .paymentStatus(PaymentStatus.PENDING)
                .subtotal(BigDecimal.valueOf(380))
                .tax(BigDecimal.valueOf(19))
                .totalAmount(BigDecimal.valueOf(399))
                .items(List.of())
                .build();
    }

    private String createOrderJson() throws Exception {
        var item = new CreateOrderRequest.ItemRequest();
        item.setItemName("Butter Chicken");
        item.setUnitPrice(BigDecimal.valueOf(380));
        item.setQuantity(1);
        item.setMenuItemId(UUID.randomUUID());

        var req = new CreateOrderRequest();
        req.setCustomerName("Test User");
        req.setPaymentMethod("ONLINE");
        req.setType("DINE_IN");
        req.setItems(List.of(item));
        return mapper.writeValueAsString(req);
    }

    // ── POST /api/v1/orders/shop/{shopId} ─────────────────────────────────────

    @Test
    @DisplayName("POST /shop/{shopId} — 200 and order returned in response body")
    void placeOrder_validRequest_returns200() throws Exception {
        when(orderService.create(eq("shop-101"), any(), any())).thenReturn(sampleResponse());

        mvc.perform(post("/api/v1/orders/shop/shop-101")
                .contentType(MediaType.APPLICATION_JSON)
                .content(createOrderJson()))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.success").value(true))
           .andExpect(jsonPath("$.data.orderNumber").value("ORD-CTRL-1"))
           .andExpect(jsonPath("$.data.status").value("NEW"));
    }

    @Test
    @DisplayName("POST /shop/{shopId}/pos — POS endpoint returns 200")
    void posPlaceOrder_validRequest_returns200() throws Exception {
        when(orderService.create(eq("shop-101"), any(), any())).thenReturn(sampleResponse());

        mvc.perform(post("/api/v1/orders/shop/shop-101/pos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(createOrderJson()))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.data.shopId").value("shop-101"));
    }

    // ── GET /api/v1/orders/shop/{shopId}/live ─────────────────────────────────

    @Test
    @DisplayName("GET /shop/{shopId}/live — OWNER role returns 200 with orders")
    void getLiveOrders_ownerRole_returns200() throws Exception {
        when(orderService.getLiveOrders("shop-101")).thenReturn(List.of(sampleResponse()));

        mvc.perform(get("/api/v1/orders/shop/shop-101/live")
                .header("X-User-Role", "OWNER")
                .header("X-Shop-Id", "shop-101"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.data[0].orderNumber").value("ORD-CTRL-1"));
    }

    @Test
    @DisplayName("GET /shop/{shopId}/live — ADMIN role bypasses shop check")
    void getLiveOrders_adminRole_returns200() throws Exception {
        when(orderService.getLiveOrders("shop-101")).thenReturn(List.of(sampleResponse()));

        mvc.perform(get("/api/v1/orders/shop/shop-101/live")
                .header("X-User-Role", "ADMIN")
                .header("X-Shop-Id", "different-shop"))
           .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /shop/{shopId}/live — CUSTOMER role returns 403")
    void getLiveOrders_customerRole_returns403() throws Exception {
        mvc.perform(get("/api/v1/orders/shop/shop-101/live")
                .header("X-User-Role", "CUSTOMER")
                .header("X-Shop-Id", "shop-101"))
           .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /shop/{shopId}/live — wrong shopId in header returns 403")
    void getLiveOrders_wrongShopId_returns403() throws Exception {
        mvc.perform(get("/api/v1/orders/shop/shop-101/live")
                .header("X-User-Role", "OWNER")
                .header("X-Shop-Id", "shop-999"))
           .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /shop/{shopId}/live — empty orders list returns 200 with empty array")
    void getLiveOrders_noOrders_returns200EmptyArray() throws Exception {
        when(orderService.getLiveOrders("shop-101")).thenReturn(List.of());

        mvc.perform(get("/api/v1/orders/shop/shop-101/live")
                .header("X-User-Role", "OWNER")
                .header("X-Shop-Id", "shop-101"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.data").isArray())
           .andExpect(jsonPath("$.data").isEmpty());
    }

    // ── PUT /api/v1/orders/{id}/status ────────────────────────────────────────

    @Test
    @DisplayName("PUT /{id}/status — valid status transition returns 200")
    void updateStatus_validTransition_returns200() throws Exception {
        var id = UUID.randomUUID();
        var updated = sampleResponse();
        // rebuild with new status
        updated = OrderResponse.builder()
                .id(id).orderNumber("ORD-CTRL-1").shopId("shop-101").customerName("Test")
                .type(OrderType.DINE_IN).status(OrderStatus.ACCEPTED)
                .paymentMethod(PaymentMethod.ONLINE).paymentStatus(PaymentStatus.PENDING)
                .subtotal(BigDecimal.valueOf(380)).tax(BigDecimal.valueOf(19))
                .totalAmount(BigDecimal.valueOf(399)).items(List.of()).build();
        when(orderService.updateStatus(eq(id), eq("ACCEPTED"), any())).thenReturn(updated);

        mvc.perform(put("/api/v1/orders/" + id + "/status?status=ACCEPTED"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.data.status").value("ACCEPTED"));
    }

    // ── GET /api/v1/orders/{id} ───────────────────────────────────────────────

    @Test
    @DisplayName("GET /{id} — existing order returns 200")
    void getById_existing_returns200() throws Exception {
        var id = UUID.randomUUID();
        var resp = sampleResponse();
        when(orderService.getById(id)).thenReturn(Optional.of(resp));

        mvc.perform(get("/api/v1/orders/" + id))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.data.orderNumber").value("ORD-CTRL-1"));
    }

    @Test
    @DisplayName("GET /{id} — missing order returns 404")
    void getById_missing_returns404() throws Exception {
        when(orderService.getById(any())).thenReturn(Optional.empty());

        mvc.perform(get("/api/v1/orders/" + UUID.randomUUID()))
           .andExpect(status().isNotFound());
    }
}
