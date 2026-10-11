package in.aviqr.order.controller;
import in.aviqr.order.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
@RestController @RequestMapping("/api/v1/orders/internal/payment-target") @RequiredArgsConstructor
public class PaymentTargetController {
 private final OrderService orders;private final BillService bills;
 @GetMapping("/{id}") public Map<String,Object> target(@PathVariable UUID id,@RequestParam(defaultValue="ORDER") String type){
  if("BILL".equals(type)){var b=bills.getById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));return Map.of("shopId",b.getShopId(),"amount",b.getTotalAmount(),"customerIds",b.getOrders().stream().map(o->o.getCustomerId()==null?"":o.getCustomerId()).distinct().toList());}
  if(!"ORDER".equals(type))throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  var o=orders.getById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));return Map.of("shopId",o.getShopId(),"amount",o.getTotalAmount(),"customerIds",List.of(o.getCustomerId()==null?"":o.getCustomerId()));
 }
}
