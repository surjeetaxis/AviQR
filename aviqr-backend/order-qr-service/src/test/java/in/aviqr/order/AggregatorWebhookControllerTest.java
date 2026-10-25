package in.aviqr.order;

import in.aviqr.order.entity.AggregatorShopMapping;
import in.aviqr.order.entity.Order;
import in.aviqr.order.repository.AggregatorShopMappingRepository;
import in.aviqr.order.repository.OrderRepository;
import in.aviqr.order.service.OrderService;
import in.aviqr.order.service.QrService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = in.aviqr.order.controller.AggregatorWebhookController.class,
            excludeAutoConfiguration = {
                org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class,
                org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration.class
            })
@TestPropertySource(properties = {
    "aggregator.zomato.secret=zomato-test-secret",
    "aggregator.swiggy.token=swiggy-test-token"
})
class AggregatorWebhookControllerTest {

    @Autowired MockMvc mvc;
    @MockBean OrderRepository orderRepo;
    @MockBean OrderService orderService;
    @MockBean AggregatorShopMappingRepository mappingRepo;
    @MockBean QrService qrService;
    @MockBean in.aviqr.order.service.BillService bills;

    private static final String ZOMATO_BODY = """
        {"order_id":"Z-1","restaurant_id":"543210","order_total":350,"customer_name":"Asha",
         "order_items":[{"item_name":"Dosa","quantity":2,"base_price":150}]}""";

    private static String sign(String body) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("zomato-test-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
    }

    private void mapped() {
        var m = new AggregatorShopMapping();
        m.setShopId("shop-101"); m.setPlatform("ZOMATO"); m.setAggregatorShopId("543210");
        when(mappingRepo.findByPlatformAndAggregatorShopId("ZOMATO", "543210")).thenReturn(Optional.of(m));
    }

    @Test void zomatoWithValidSignatureOverRawBodyIsAccepted() throws Exception {
        mapped();
        mvc.perform(post("/api/v1/aggregator/zomato/webhook").contentType(MediaType.APPLICATION_JSON)
                .content(ZOMATO_BODY).header("X-Zomato-Signature", sign(ZOMATO_BODY)))
           .andExpect(status().isOk());
        verify(orderRepo).save(argThat((Order o) -> "shop-101".equals(o.getShopId()) && "ZOM-Z-1".equals(o.getOrderNumber())));
    }

    @Test void zomatoWithBadSignatureIsRejected() throws Exception {
        mvc.perform(post("/api/v1/aggregator/zomato/webhook").contentType(MediaType.APPLICATION_JSON)
                .content(ZOMATO_BODY).header("X-Zomato-Signature", "00" + sign(ZOMATO_BODY).substring(2)))
           .andExpect(status().isUnauthorized());
        verify(orderRepo, never()).save(any());
    }

    @Test void zomatoWithoutSignatureIsRejected() throws Exception {
        mvc.perform(post("/api/v1/aggregator/zomato/webhook").contentType(MediaType.APPLICATION_JSON).content(ZOMATO_BODY))
           .andExpect(status().isUnauthorized());
        verify(orderRepo, never()).save(any());
    }

    @Test void unmappedRestaurantIsRejectedNotUsedAsShopId() throws Exception {
        when(mappingRepo.findByPlatformAndAggregatorShopId(any(), any())).thenReturn(Optional.empty());
        mvc.perform(post("/api/v1/aggregator/zomato/webhook").contentType(MediaType.APPLICATION_JSON)
                .content(ZOMATO_BODY).header("X-Zomato-Signature", sign(ZOMATO_BODY)))
           .andExpect(status().isNotFound());
        verify(orderRepo, never()).save(any());
    }

    @Test void replayedPushDoesNotCreateASecondOrder() throws Exception {
        when(orderRepo.findByOrderNumber("ZOM-Z-1")).thenReturn(Optional.of(new Order()));
        mvc.perform(post("/api/v1/aggregator/zomato/webhook").contentType(MediaType.APPLICATION_JSON)
                .content(ZOMATO_BODY).header("X-Zomato-Signature", sign(ZOMATO_BODY)))
           .andExpect(status().isOk());
        verify(orderRepo, never()).save(any());
    }

    @Test void swiggyWithWrongTokenIsRejected() throws Exception {
        mvc.perform(post("/api/v1/aggregator/swiggy/webhook").contentType(MediaType.APPLICATION_JSON)
                .content("{\"order_id\":\"S-1\",\"outlet_id\":\"OUT-1\",\"items\":[]}").header("X-Swiggy-Token", "wrong"))
           .andExpect(status().isUnauthorized());
        verify(orderRepo, never()).save(any());
    }

    @Test void customerCannotRemapAShop() throws Exception {
        mvc.perform(post("/api/v1/aggregator/mapping").contentType(MediaType.APPLICATION_JSON)
                .content("{\"shopId\":\"shop-101\",\"platform\":\"ZOMATO\",\"aggregatorShopId\":\"999\"}")
                .header("X-User-Id", "customer-a").header("X-User-Role", "CUSTOMER"))
           .andExpect(status().isForbidden());
        verify(mappingRepo, never()).save(any());
    }

    @Test void ownerOfAnotherShopCannotRemapAShop() throws Exception {
        when(orderService.isShopOwnedBy("shop-101", "owner-b")).thenReturn(false);
        mvc.perform(post("/api/v1/aggregator/mapping").contentType(MediaType.APPLICATION_JSON)
                .content("{\"shopId\":\"shop-101\",\"platform\":\"ZOMATO\",\"aggregatorShopId\":\"999\"}")
                .header("X-User-Id", "owner-b").header("X-User-Role", "OWNER").header("X-Shop-Id", "shop-999"))
           .andExpect(status().isForbidden());
        verify(mappingRepo, never()).save(any());
    }

    @Test void restaurantIdAlreadyLinkedElsewhereIsRefused() throws Exception {
        var other = new AggregatorShopMapping();
        other.setShopId("shop-202"); other.setPlatform("ZOMATO"); other.setAggregatorShopId("543210");
        when(mappingRepo.findByPlatformAndAggregatorShopId("ZOMATO", "543210")).thenReturn(Optional.of(other));
        mvc.perform(post("/api/v1/aggregator/mapping").contentType(MediaType.APPLICATION_JSON)
                .content("{\"shopId\":\"shop-101\",\"platform\":\"ZOMATO\",\"aggregatorShopId\":\"543210\"}")
                .header("X-User-Id", "owner-a").header("X-User-Role", "OWNER").header("X-Shop-Id", "shop-101"))
           .andExpect(status().isConflict());
        verify(mappingRepo, never()).save(any());
    }

    @Test void ownerCanMapOwnShop() throws Exception {
        when(mappingRepo.findByPlatformAndAggregatorShopId("ZOMATO", "543210")).thenReturn(Optional.empty());
        when(mappingRepo.findByShopIdAndPlatform("shop-101", "ZOMATO")).thenReturn(Optional.empty());
        when(mappingRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        mvc.perform(post("/api/v1/aggregator/mapping").contentType(MediaType.APPLICATION_JSON)
                .content("{\"shopId\":\"shop-101\",\"platform\":\"ZOMATO\",\"aggregatorShopId\":\"543210\"}")
                .header("X-User-Id", "owner-a").header("X-User-Role", "OWNER").header("X-Shop-Id", "shop-101"))
           .andExpect(status().isOk());
    }
}
