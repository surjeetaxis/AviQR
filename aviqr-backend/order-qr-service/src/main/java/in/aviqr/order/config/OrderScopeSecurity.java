package in.aviqr.order.config;
import in.aviqr.order.service.OrderService;
import in.aviqr.order.service.BillService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;
import org.springframework.web.servlet.*;
import org.springframework.web.method.HandlerMethod;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import jakarta.servlet.http.*;
import java.util.*;
@Configuration @RequiredArgsConstructor
public class OrderScopeSecurity implements WebMvcConfigurer {
 private final OrderService orders;private final BillService bills;
 public boolean staff(String shop,HttpServletRequest req){String role=req.getHeader("X-User-Role"),uid=req.getHeader("X-User-Id");
  if(Set.of("ADMIN","SUPPORT").contains(role==null?"":role))return true;
  return shop!=null && uid!=null && Set.of("OWNER","MANAGER","CASHIER","KITCHEN","ORDER_VIEWER","SUPPLIER","HOTEL","MALL").contains(role==null?"":role)
   && (shop.equals(req.getHeader("X-Shop-Id")) || orders.isShopOwnedBy(shop,uid));}
 @Override public void addInterceptors(InterceptorRegistry registry){registry.addInterceptor(new HandlerInterceptor(){
  @Override public boolean preHandle(HttpServletRequest req,HttpServletResponse res,Object handler){
   if(!(handler instanceof HandlerMethod))return true;
   String path=req.getRequestURI();var vars=(Map<String,String>)req.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);if(vars==null)return true;
   // Internal capture synchronization is credential-gated separately; it has no caller user.
   if(path.endsWith("/payment-sync") || path.contains("/internal/"))return true;
   if(path.endsWith("/pos") && (!Set.of("ADMIN","SUPPORT","OWNER","MANAGER","CASHIER","HOTEL","MALL","SUPPLIER").contains(Optional.ofNullable(req.getHeader("X-User-Role")).orElse("")) || !staff(vars.get("shopId"),req)))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Shop access denied");
   String id=vars.get("id");if(id==null)return true;
   String uid=req.getHeader("X-User-Id");boolean allowed=true;
   if(path.startsWith("/api/v1/orders/")){
    var order=orders.getById(UUID.fromString(id)).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
    allowed=staff(order.getShopId(),req) || (!path.endsWith("/kot") && "CUSTOMER".equals(req.getHeader("X-User-Role")) && uid!=null && uid.equals(order.getCustomerId()));
   } else if(path.startsWith("/api/v1/bills/") && path.contains("/invoice")){
    var bill=bills.getById(UUID.fromString(id)).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
    allowed=staff(bill.getShopId(),req) || ("CUSTOMER".equals(req.getHeader("X-User-Role")) && uid!=null && bill.getOrders()!=null && !bill.getOrders().isEmpty() && bill.getOrders().stream().allMatch(o->uid.equals(o.getCustomerId())));
   }
   if(!allowed)throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Order access denied");return true;
  }
 });}
}
