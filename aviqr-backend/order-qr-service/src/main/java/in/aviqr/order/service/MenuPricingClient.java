package in.aviqr.order.service;
import in.aviqr.order.dto.CreateOrderRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.math.BigDecimal;
import java.util.*;
@Service @RequiredArgsConstructor
public class MenuPricingClient {
 private final RestTemplate client;
 public void apply(String shop,CreateOrderRequest request){
  Map response;
  try{response=client.postForObject("http://menu-ocr-service/api/v1/menu/internal/checkout/"+java.net.URLEncoder.encode(shop,java.nio.charset.StandardCharsets.UTF_8),request.getItems(),Map.class);}
  catch(HttpClientErrorException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Menu selections unavailable; refresh the menu");}
  catch(Exception e){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Menu pricing unavailable; retry later");}
  if(response==null || !(response.get("items") instanceof List<?> quotes) || quotes.size()!=request.getItems().size())throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Menu pricing unavailable");
  for(int i=0;i<quotes.size();i++){
   var item=request.getItems().get(i);if(!(quotes.get(i) instanceof Map quote) || !item.getMenuItemId().toString().equals(String.valueOf(quote.get("menuItemId"))))throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Invalid pricing response");
   var amount=new BigDecimal(String.valueOf(quote.get("unitPrice")));if(amount.signum()<=0)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Menu price unavailable");
   item.setUnitPrice(amount);item.setItemName(String.valueOf(quote.get("itemName")));item.setVariantName(quote.get("variantName")==null?null:String.valueOf(quote.get("variantName")));
   var addons=new ArrayList<CreateOrderRequest.AddonSelectionRequest>();
   if(quote.get("addons") instanceof List<?> extras)for(var extra:extras){var data=(Map)extra;var addon=new CreateOrderRequest.AddonSelectionRequest();addon.setName(String.valueOf(data.get("name")));addon.setPrice(new BigDecimal(String.valueOf(data.get("price"))));addons.add(addon);}
   item.setAddons(addons);
  }
 }
}
