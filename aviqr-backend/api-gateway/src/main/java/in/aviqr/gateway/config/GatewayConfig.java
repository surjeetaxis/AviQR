package in.aviqr.gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import reactor.core.publisher.Mono;

@Configuration
public class GatewayConfig {
    // @Primary: RequestRateLimiterGatewayFilterFactory injects one default KeyResolver.
    // With a second resolver (userKeyResolver below) and no primary, the gateway fails
    // to start. Routes that want the per-user bucket name userKeyResolver explicitly.
    @Bean @Primary
    public KeyResolver ipKeyResolver(ClientIpResolver ips) {
        return exchange -> {
            String ip = ips.resolve(exchange);
            return Mono.just(ip);
        };
    }

    /** For routes where the limiter runs after AuthenticationFilter: X-User-Id is then the
     *  verified token subject (the gateway strips caller-supplied identity headers and the
     *  filter sets it), so each user gets their own bucket. Falls back to the client IP. */
    @Bean
    public KeyResolver userKeyResolver(ClientIpResolver ips) {
        return exchange -> {
            String uid = exchange.getRequest().getHeaders().getFirst("X-User-Id");
            return Mono.just(uid != null && !uid.isBlank() ? "user:" + uid : "ip:" + ips.resolve(exchange));
        };
    }
}
