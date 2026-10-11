package in.aviqr.menu.internal;
import in.aviqr.menu.repository.*;
import in.aviqr.menu.service.DynamicPricingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import jakarta.validation.*;
import jakarta.validation.constraints.*;
import java.math.*;
import java.util.*;
/** Internal, signed-service-only pricing. Client-supplied names/prices never determine customer bills. */
@RestController @RequestMapping("/api/v1/menu/internal/checkout") @RequiredArgsConstructor
public class CheckoutPriceController {
 private final MenuItemRepository items;private final MenuVariantRepository variants;private final MenuAddonRepository addons;private final DynamicPricingService pricing;
 public record Addon(@NotBlank String name){}
 public record Selection(@NotNull UUID menuItemId,String variantName,@Size(max=20) List<@Valid Addon> addons){}
 public record Quote(UUID menuItemId,String itemName,String variantName,BigDecimal unitPrice,List<Map<String,Object>> addons){}
 @PostMapping("/{shopId}") public Map<String,Object> quote(@PathVariable String shopId,@Valid @RequestBody @Size(min=1,max=100) List<@Valid Selection> selections){
  var extras=addons.findByShopIdAndActiveTrue(shopId);var result=new ArrayList<Quote>();
  for(var selection:selections){var item=items.findById(selection.menuItemId()).orElseThrow(()->new ResponseStatusException(HttpStatus.BAD_REQUEST,"Menu item unavailable"));
   if(!shopId.equals(item.getShopId()) || !Boolean.TRUE.equals(item.getAvailable()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Menu item unavailable in this shop");
   String variant=null;BigDecimal price=pricing.getEffectivePrice(shopId,item.getPrice());
   if(selection.variantName()!=null && !selection.variantName().isBlank()){
    var matches=variants.findByMenuItemIdOrderBySortOrderAsc(item.getId()).stream().filter(v->Boolean.TRUE.equals(v.getActive()) && selection.variantName().equals(v.getVariantName())).toList();
    if(matches.size()!=1)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Menu variant unavailable");variant=matches.get(0).getVariantName();price=matches.get(0).getPrice();
   }
   var chosen=new ArrayList<Map<String,Object>>();var unique=new HashSet<String>();
   if(selection.addons()!=null)for(var addon:selection.addons()){
    var matches=extras.stream().filter(a->a.getName().equals(addon.name())).toList();if(matches.size()!=1 || !unique.add(addon.name()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Menu add-on unavailable or repeated");
    var a=matches.get(0);chosen.add(Map.of("name",a.getName(),"price",a.getPrice()));price=price.add(a.getPrice());
   }
   if(price.signum()<=0)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Item cannot be ordered at this price");
   result.add(new Quote(item.getId(),item.getName(),variant,price.setScale(2,RoundingMode.HALF_UP),chosen));
  }
  return Map.of("items",result);
 }
}
