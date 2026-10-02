package in.aviqr.gateway.filter;
import org.springframework.cloud.gateway.filter.*;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import jakarta.annotation.PostConstruct;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
@Component
public class ServiceBoundaryFilter implements GlobalFilter, Ordered {
    private final in.aviqr.gateway.config.ClientIpResolver ips;
    public ServiceBoundaryFilter(in.aviqr.gateway.config.ClientIpResolver ips) { this.ips=ips; }
    @Value("${INTERNAL_SYNC_SECRET:}") private String secret;
    @PostConstruct void validateSecret() {
        if (secret.length()<32 || secret.startsWith("replace_")) throw new IllegalStateException("INTERNAL_SYNC_SECRET must contain at least 32 characters");
    }
    @Override public int getOrder() { return -100; }
    @Override public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        if (exchange.getRequest().getURI().getPath().contains("/internal/")) {
            exchange.getResponse().setStatusCode(HttpStatus.NOT_FOUND); return exchange.getResponse().setComplete();
        }
        var request = exchange.getRequest().mutate().headers(headers -> {
            for (String name : java.util.List.of("X-User-Id","X-User-Role","X-Shop-Id","X-User-Phone","X-Session-Id","X-Internal-Secret","X-Gateway-Secret")) headers.remove(name);
            var route = exchange.getAttribute(org.springframework.cloud.gateway.support.ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR);
            if (route instanceof org.springframework.cloud.gateway.route.Route selected && "lb".equals(selected.getUri().getScheme())) headers.set("X-Gateway-Secret",secret);
            headers.set("X-Forwarded-For",ips.resolve(exchange));
        }).build();
        return chain.filter(exchange.mutate().request(request).build());
    }
}
