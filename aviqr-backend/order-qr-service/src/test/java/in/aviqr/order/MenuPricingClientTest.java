package in.aviqr.order;
import in.aviqr.order.dto.CreateOrderRequest;
import in.aviqr.order.service.MenuPricingClient;
import org.springframework.web.client.RestTemplate;
import org.junit.jupiter.api.Test;
import java.util.*;
import java.math.BigDecimal;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.assertj.core.api.Assertions.*;
class MenuPricingClientTest {
 @Test void customerSubmittedPriceAndNameAreReplacedByServerQuote(){
  var client=mock(RestTemplate.class);var id=UUID.randomUUID();var item=new CreateOrderRequest.OrderItemRequest();item.setMenuItemId(id);item.setItemName("Fake item");item.setUnitPrice(new BigDecimal("0.01"));var request=new CreateOrderRequest();request.setItems(List.of(item));
  when(client.postForObject(anyString(),any(),eq(Map.class))).thenReturn(Map.of("items",List.of(Map.of("menuItemId",id.toString(),"itemName","Paneer Tikka","unitPrice","310.00","addons",List.of(Map.of("name","Cheese","price","30.00"))))));
  new MenuPricingClient(client).apply("shop-101",request);assertThat(item.getUnitPrice()).isEqualByComparingTo("310.00");assertThat(item.getItemName()).isEqualTo("Paneer Tikka");assertThat(item.getAddons().get(0).getPrice()).isEqualByComparingTo("30.00");
 }
 @Test void unavailablePricingNeverFallsBackToClientPrice(){var client=mock(RestTemplate.class);when(client.postForObject(anyString(),any(),eq(Map.class))).thenThrow(new IllegalStateException());var request=new CreateOrderRequest();request.setItems(List.of());assertThatThrownBy(()->new MenuPricingClient(client).apply("shop-101",request)).hasMessageContaining("pricing unavailable");}
}
