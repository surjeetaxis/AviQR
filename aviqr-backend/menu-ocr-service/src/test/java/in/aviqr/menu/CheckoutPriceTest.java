package in.aviqr.menu;
import in.aviqr.menu.entity.*;
import in.aviqr.menu.repository.*;
import in.aviqr.menu.internal.CheckoutPriceController;
import in.aviqr.menu.service.DynamicPricingService;
import org.junit.jupiter.api.Test;
import java.util.*;
import java.math.BigDecimal;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
class CheckoutPriceTest {
 @Test void quoteUsesStoredPricesAndRejectsCrossShopItems(){
  var items=mock(MenuItemRepository.class);var variants=mock(MenuVariantRepository.class);var addons=mock(MenuAddonRepository.class);var pricing=mock(DynamicPricingService.class);var id=UUID.randomUUID();
  var item=MenuItem.builder().id(id).shopId("shop-101").name("Paneer Tikka").price(new BigDecimal("280")).build();when(items.findById(id)).thenReturn(Optional.of(item));when(pricing.getEffectivePrice("shop-101",item.getPrice())).thenReturn(item.getPrice());when(addons.findByShopIdAndActiveTrue("shop-101")).thenReturn(List.of(MenuAddon.builder().name("Cheese").price(new BigDecimal("30")).build()));
  var controller=new CheckoutPriceController(items,variants,addons,pricing);var selections=List.of(new CheckoutPriceController.Selection(id,null,List.of(new CheckoutPriceController.Addon("Cheese"))));
  var quote=(CheckoutPriceController.Quote)((List)controller.quote("shop-101",selections).get("items")).get(0);assertThat(quote.unitPrice()).isEqualByComparingTo("310.00");
  assertThatThrownBy(()->controller.quote("shop-999",selections)).hasMessageContaining("unavailable in this shop");
 }
}
