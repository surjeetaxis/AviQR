package in.aviqr.gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.RateLimiter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import reactor.core.publisher.Mono;
import java.util.HashMap;
import java.util.Map;

/**
 * In local dev Redis is often not running.
 * This no-op rate limiter replaces the Redis-backed one so that
 * /auth/login, /auth/register and /menu/public/** don't return 500.
 */
@Configuration
@Profile("local")
public class LocalRateLimiterConfig {

    @Bean
    @Primary
    public RateLimiter<Object> noopRateLimiter() {
        return new RateLimiter<>() {

            private final Map<String, Object> configs = new HashMap<>();

            @Override
            public Class<Object> getConfigClass() { return Object.class; }

            @Override
            public Object newConfig() { return new Object(); }

            @Override
            public Map<String, Object> getConfig() { return configs; }

            @Override
            public Mono<Response> isAllowed(String routeId, String id) {
                return Mono.just(new Response(true, Map.of(
                    "X-RateLimit-Remaining",      "999",
                    "X-RateLimit-Replenish-Rate",  "999",
                    "X-RateLimit-Burst-Capacity",  "999"
                )));
            }
        };
    }
}
