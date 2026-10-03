package in.aviqr.gateway.filter;

import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

/** Enforce TLS before routing, trusting protocol headers only from configured proxies. */
@Component
public class TransportSecurityFilter implements WebFilter, Ordered {
    @Value("${app.transport.require-https:false}") private boolean requireHttps;
    @Value("${app.trusted-proxy-ips:127.0.0.1,::1}") private String trustedProxies;

    @Override public int getOrder() { return -200; }

    @Override public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        if (!path.startsWith("/api/")) return chain.filter(exchange);
        exchange.getResponse().getHeaders().set("Cache-Control", "no-store");
        exchange.getResponse().getHeaders().set("Pragma", "no-cache");
        if (requireHttps && !isSecure(exchange)) {
            // Redirecting cannot undo disclosure of a body already sent over HTTP.
            exchange.getResponse().setStatusCode(HttpStatus.UPGRADE_REQUIRED);
            return exchange.getResponse().setComplete();
        }
        return chain.filter(exchange);
    }

    private boolean isSecure(ServerWebExchange exchange) {
        if ("https".equalsIgnoreCase(exchange.getRequest().getURI().getScheme())) return true;
        var remote = exchange.getRequest().getRemoteAddress();
        if (remote == null || remote.getAddress() == null) return false;
        String peer = remote.getAddress().getHostAddress();
        boolean trusted = Arrays.stream(trustedProxies.split(",")).map(String::trim).anyMatch(peer::equals);
        var protocols = exchange.getRequest().getHeaders().get("X-Forwarded-Proto");
        return trusted && protocols != null && protocols.size() == 1 && "https".equalsIgnoreCase(protocols.getFirst());
    }
}
