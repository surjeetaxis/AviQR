package in.aviqr.gateway.filter;

import org.springframework.cloud.gateway.config.GlobalCorsProperties;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;
import org.springframework.web.server.*;
import reactor.core.publisher.Mono;

/** Apply the gateway origin policy to public-key lookup and errors before route matching. */
@Component
public class ApiCorsFilter implements WebFilter, Ordered {
    private final CorsWebFilter delegate;
    public ApiCorsFilter(GlobalCorsProperties properties) {
        var source=new UrlBasedCorsConfigurationSource();
        properties.getCorsConfigurations().forEach(source::registerCorsConfiguration);
        delegate=new CorsWebFilter(source);
    }
    @Override public int getOrder() { return -210; }
    @Override public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        return delegate.filter(exchange,chain);
    }
}
