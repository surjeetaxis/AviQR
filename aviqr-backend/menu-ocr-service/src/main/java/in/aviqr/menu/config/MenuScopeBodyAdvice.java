package in.aviqr.menu.config;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.RequestBodyAdviceAdapter;
import org.springframework.core.MethodParameter;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.beans.BeanWrapperImpl;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.context.request.*;
import jakarta.servlet.http.HttpServletRequest;
import java.lang.reflect.Type;
import java.util.*;

@ControllerAdvice @RequiredArgsConstructor
public class MenuScopeBodyAdvice extends RequestBodyAdviceAdapter {
 private final MenuScopeSecurity scope;
 @Override public boolean supports(MethodParameter p,Type t,Class<? extends HttpMessageConverter<?>> c){return p.getContainingClass().getPackageName().startsWith("in.aviqr.menu.controller");}
 private Object value(Object body,String name){
  if(body instanceof Map map)return map.get(name);
  var bean=new BeanWrapperImpl(body);if(bean.isReadableProperty(name))return bean.getPropertyValue(name);
  if(body.getClass().isRecord())for(var component:body.getClass().getRecordComponents())if(component.getName().equals(name))try{component.getAccessor().setAccessible(true);return component.getAccessor().invoke(body);}catch(Exception e){throw new IllegalStateException(e);}
  return null;
 }
 private void check(Object body,HttpServletRequest req) {
  if(body==null)return;if(body instanceof Collection<?> collection){collection.forEach(b->check(b,req));return;}
  for(String field:List.of("shopId","fromShopId")){var shop=value(body,field);if(shop!=null){scope.requireShop(shop.toString(),req);if(req.getAttribute("verifiedShop")!=null && "shopId".equals(field) && !shop.equals(req.getAttribute("verifiedShop")))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Cannot change resource shop");}}
  var targets=value(body,"toShopIds");if(targets instanceof Collection<?> shops)for(var shop:shops)scope.requireShop(shop.toString(),req);
  var material=value(body,"rawMaterialId");if(material!=null){String shop=scope.materialShop(UUID.fromString(material.toString()));scope.requireShop(shop,req);if(req.getAttribute("verifiedShop")!=null && !shop.equals(req.getAttribute("verifiedShop")))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Recipe material belongs to another shop");}
  var item=value(body,"menuItemId");if(item!=null){String shop=scope.itemShop(UUID.fromString(item.toString()));scope.requireShop(shop,req);if(req.getAttribute("verifiedShop")!=null && !shop.equals(req.getAttribute("verifiedShop")))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Menu item belongs to another shop");}
  var category=value(body,"categoryId");if(category!=null)scope.requireCategory(UUID.fromString(category.toString()),value(body,"shopId"),req);
  if("POST".equals(req.getMethod()) && body.getClass().getPackageName().equals("in.aviqr.menu.entity") && value(body,"id")!=null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"New resources cannot supply an existing ID");
 }
 @Override public Object afterBodyRead(Object body,HttpInputMessage input,MethodParameter p,Type t,Class<? extends HttpMessageConverter<?>> c){var req=((ServletRequestAttributes)RequestContextHolder.currentRequestAttributes()).getRequest();check(body,req);return body;}
}
