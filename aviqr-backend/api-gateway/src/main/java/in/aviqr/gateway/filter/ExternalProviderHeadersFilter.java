package in.aviqr.gateway.filter;
import org.springframework.cloud.gateway.filter.*;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
@Component
public class ExternalProviderHeadersFilter implements GlobalFilter, Ordered {
    @Override public int getOrder() { return 10000; }
    @Override public Mono<Void> filter(ServerWebExchange exchange,GatewayFilterChain chain) {
        Route route=exchange.getAttribute(ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR);
        if (route!=null && !"lb".equals(route.getUri().getScheme())) {
            var request=exchange.getRequest().mutate().headers(headers -> {
                for (String name : java.util.List.of("X-Gateway-Secret","X-Internal-Secret","X-User-Id","X-User-Role","X-Shop-Id","X-User-Phone","X-Session-Id","Cookie","X-Trusted-Device")) headers.remove(name);
                // OpenAI uses its own server-side Authorization header; Anthropic uses x-api-key.
                if ("ai-proxy".equals(route.getId())) headers.remove("Authorization");
            }).build();
            return chain.filter(exchange.mutate().request(request).build());
        }
        return chain.filter(exchange);
    }
}
