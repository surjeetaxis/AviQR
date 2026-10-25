package in.aviqr.gateway;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.gateway.filter.factory.RequestRateLimiterGatewayFilterFactory;
import org.springframework.cloud.gateway.route.RouteLocator;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Boots the whole gateway application context with the real application.properties,
 * the way production does at startup. Unit tests of individual beans and of the route
 * config did not catch a second KeyResolver bean breaking RequestRateLimiter wiring;
 * the gateway then failed to start in production and the deploy rolled back.
 * Redis and Eureka are never contacted: the rate limiter connects lazily and
 * discovery is switched off.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "eureka.client.enabled=false",
    "spring.cloud.discovery.enabled=false",
    "app.jwt.secret=test-only-secret-0123456789abcdef0123456789abcdef0123",
    "INTERNAL_SYNC_SECRET=test-only-internal-secret-0123456789abcdef",
})
class GatewayContextStartsTest {

    @Autowired RequestRateLimiterGatewayFilterFactory rateLimiter;
    @Autowired RouteLocator routes;

    @Test void contextStartsAndEveryRouteBuilds() {
        assertThat(rateLimiter).isNotNull();
        // Building the routes applies every configured filter, including each route's key-resolver.
        assertThat(routes.getRoutes().collectList().block()).hasSizeGreaterThan(40);
    }
}
