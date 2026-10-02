package in.aviqr.gateway.filter;
import org.springframework.cloud.gateway.filter.*;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.http.server.reactive.*;
import org.springframework.core.io.buffer.*;
import lombok.RequiredArgsConstructor;
import reactor.core.publisher.*;
import java.util.*;
@Component @RequiredArgsConstructor
public class ServiceAssertionFilter implements GlobalFilter,Ordered {
 private final in.aviqr.identity.ServiceIdentity signer;
 public int getOrder(){return 9000;}
 public Mono<Void> filter(ServerWebExchange exchange,GatewayFilterChain chain){
  var selected=exchange.getAttribute(org.springframework.cloud.gateway.support.ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR);
  if(!(selected instanceof org.springframework.cloud.gateway.route.Route route) || !"lb".equals(route.getUri().getScheme()))return chain.filter(exchange);
  return DataBufferUtils.join(exchange.getRequest().getBody(),26*1024*1024).defaultIfEmpty(exchange.getResponse().bufferFactory().wrap(new byte[0])).flatMap(buffer->{
   byte[] bytes=new byte[buffer.readableByteCount()];buffer.read(bytes);DataBufferUtils.release(buffer);
   var headers=new HashMap<String,String>();for(String name:in.aviqr.identity.ServiceIdentity.boundHeaders())if(exchange.getRequest().getHeaders().getFirst(name)!=null)headers.put(name,exchange.getRequest().getHeaders().getFirst(name));
   var uri=exchange.getRequest().getURI();String target=uri.getRawPath()+(uri.getRawQuery()==null?"":"?"+uri.getRawQuery());
   String assertion=signer.sign(route.getUri().getHost(),exchange.getRequest().getMethod().name(),target,bytes,headers);
   var request=new ServerHttpRequestDecorator(exchange.getRequest()){
    @Override public org.springframework.http.HttpHeaders getHeaders(){var result=new org.springframework.http.HttpHeaders();result.putAll(super.getHeaders());result.remove("X-Service-Assertion");result.remove("X-Step-Up-Token");if(assertion!=null)result.set("X-Service-Assertion",assertion);return result;}
    @Override public Flux<DataBuffer> getBody(){return Flux.defer(()->Flux.just(exchange.getResponse().bufferFactory().wrap(bytes)));}
   };
   return chain.filter(exchange.mutate().request(request).build());
  }).onErrorResume(DataBufferLimitException.class,error->{exchange.getResponse().setStatusCode(org.springframework.http.HttpStatus.PAYLOAD_TOO_LARGE);return exchange.getResponse().setComplete();});
 }
}
