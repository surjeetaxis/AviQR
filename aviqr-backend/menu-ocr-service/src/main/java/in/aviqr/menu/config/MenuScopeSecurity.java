package in.aviqr.menu.config;
import in.aviqr.menu.repository.*;
import in.aviqr.menu.ocr.OcrJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;
import org.springframework.web.servlet.*;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import jakarta.servlet.http.*;
import java.util.*;

/** Enforces scope before every menu controller, including previously unguarded ID routes. */
@Configuration @RequiredArgsConstructor
public class MenuScopeSecurity implements WebMvcConfigurer {
 private final MenuItemRepository items; private final CategoryRepository categories;
 private final RawMaterialRepository materials; private final MenuAddonRepository addons;
 private final DiningAreaRepository areas; private final PricingRuleRepository pricing;
 private final MenuShortcodeRepository shortcodes; private final OcrJobRepository jobs;
 private final RestTemplate client;
 public void requireShop(String shop,HttpServletRequest req) {
  String role=req.getHeader("X-User-Role"),uid=req.getHeader("X-User-Id");
  if(shop==null || shop.isBlank())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Shop required");
  if(!Set.of("GET","HEAD","OPTIONS").contains(req.getMethod()) && Set.of("ORDER_VIEWER","KITCHEN","CASHIER").contains(role==null?"":role))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Menu editing permission required");
  if(Set.of("ADMIN","SUPPORT").contains(role==null?"":role))return;
  if(Set.of("OWNER","MANAGER","CASHIER","KITCHEN","MENU_EDITOR","ORDER_VIEWER","SUPPLIER","HOTEL","MALL").contains(role==null?"":role)) {
   if(shop.equals(req.getHeader("X-Shop-Id")))return;
   try {var response=client.getForObject("http://shop-mall-service/api/v1/shops/"+UUID.fromString(shop),Map.class);
    if(response!=null && response.get("data") instanceof Map data && uid!=null && uid.equals(String.valueOf(data.get("ownerId"))))return;
   }catch(Exception ignored){}
  }
  throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Shop access denied");
 }
 public void requireCategory(UUID id,Object requestedShop,HttpServletRequest req){String shop=categories.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Category not found")).getShopId();requireShop(shop,req);if(requestedShop!=null && !requestedShop.equals(shop))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Category belongs to another shop");}
 public String itemShop(UUID id){return items.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Item not found")).getShopId();}
 public String materialShop(UUID id){return materials.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Material not found")).getShopId();}
 @Override public void addInterceptors(InterceptorRegistry registry){registry.addInterceptor(new HandlerInterceptor(){
  @Override public boolean preHandle(HttpServletRequest req,HttpServletResponse response,Object handler){
   if(!(handler instanceof HandlerMethod))return true;
   String path=req.getRequestURI();
   if(path.startsWith("/api/v1/menu/public/") || (path.startsWith("/actuator/") || path.contains("/internal/")))return true;
   var vars=(Map<String,String>)req.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);if(vars==null)vars=Map.of();
   // Public variant prices can be read; recipe/cost/stock information cannot.
   if("GET".equals(req.getMethod()) && path.matches("/api/v1/items/[^/]+/variants"))return true;
   if(vars.containsKey("shopId"))requireShop(vars.get("shopId"),req);
   if(path.equals("/api/v1/ocr/upload"))requireShop(req.getParameter("shopId"),req);
   String id=vars.getOrDefault("itemId",vars.get("id"));if(id==null)return true;
   String shop=null;
   if(path.startsWith("/api/v1/ocr/jobs/"))shop=jobs.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND)).getShopId();
   else if(path.startsWith("/api/v1/items/") || path.startsWith("/api/v1/inventory/item/"))shop=itemShop(UUID.fromString(id));
   else if(path.startsWith("/api/v1/categories/"))shop=categories.findById(UUID.fromString(id)).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND)).getShopId();
   else if(path.startsWith("/api/v1/raw-materials/"))shop=materialShop(UUID.fromString(id));
   else if(path.startsWith("/api/v1/addons/"))shop=addons.findById(UUID.fromString(id)).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND)).getShopId();
   else if(path.startsWith("/api/v1/dining-areas/"))shop=areas.findById(UUID.fromString(id)).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND)).getShopId();
   else if(path.startsWith("/api/v1/pricing-rules/"))shop=pricing.findById(UUID.fromString(id)).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND)).getShopId();
   else if(path.startsWith("/api/v1/shortcodes/"))shop=shortcodes.findById(UUID.fromString(id)).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND)).getShopId();
   if(shop!=null){requireShop(shop,req);req.setAttribute("verifiedShop",shop);}return true;
  }
 });}
}
