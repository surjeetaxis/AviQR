package in.aviqr.gateway.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.InputStream;
import java.net.InetSocketAddress;
import java.util.*;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitConfigTest {

    private static Map<Integer, List<String>> routes() throws Exception {
        var props = new Properties();
        try (InputStream in = RateLimitConfigTest.class.getResourceAsStream("/application.properties")) { props.load(in); }
        var byRoute = new TreeMap<Integer, List<String>>();
        var key = Pattern.compile("spring\\.cloud\\.gateway\\.routes\\[(\\d+)]\\.(.+)");
        for (String name : props.stringPropertyNames()) {
            var m = key.matcher(name);
            if (m.matches()) byRoute.computeIfAbsent(Integer.parseInt(m.group(1)), k -> new ArrayList<>())
                .add(m.group(2) + "=" + props.getProperty(name));
        }
        return byRoute;
    }

    @Test void everyPublicRouteIsRateLimited() throws Exception {
        var unlimited = new ArrayList<String>();
        routes().forEach((i, entries) -> {
            boolean authenticated = entries.stream().anyMatch(e -> e.matches("filters\\[\\d+]=AuthenticationFilter"));
            boolean limited = entries.stream().anyMatch(e -> e.matches("filters\\[\\d+]\\.name=RequestRateLimiter"));
            if (!authenticated && !limited)
                unlimited.add(entries.stream().filter(e -> e.startsWith("id=")).findFirst().orElse("route " + i));
        });
        assertThat(unlimited).as("public gateway routes without a RequestRateLimiter").isEmpty();
    }

    @Test void paidAiRoutesAreLimitedPerUserAfterAuthentication() throws Exception {
        for (var entries : routes().values()) {
            if (entries.stream().noneMatch(e -> e.startsWith("uri=https://api."))) continue;
            int auth = filterIndex(entries, "=AuthenticationFilter");
            int limit = filterIndex(entries, ".name=RequestRateLimiter");
            assertThat(limit).as(entries.toString()).isGreaterThan(auth);
            assertThat(entries).contains("filters[" + limit + "].args.key-resolver=#{@userKeyResolver}");
        }
    }

    private static int filterIndex(List<String> entries, String suffix) {
        var m = Pattern.compile("filters\\[(\\d+)]" + Pattern.quote(suffix) + ".*");
        return entries.stream().map(m::matcher).filter(java.util.regex.Matcher::matches)
            .mapToInt(x -> Integer.parseInt(x.group(1))).findFirst().orElse(-1);
    }

    @Test void userKeyResolverUsesTheVerifiedUserIdOrFallsBackToIp() {
        var ips = new ClientIpResolver();
        ReflectionTestUtils.setField(ips, "trustedProxies", "127.0.0.1");
        var resolver = new GatewayConfig().userKeyResolver(ips);

        var withUser = MockServerWebExchange.from(MockServerHttpRequest.get("/api/v1/ai/messages")
            .header("X-User-Id", "u-42").remoteAddress(new InetSocketAddress("203.0.113.9", 443)));
        assertThat(resolver.resolve(withUser).block()).isEqualTo("user:u-42");

        var anonymous = MockServerWebExchange.from(MockServerHttpRequest.get("/api/v1/ai/messages")
            .remoteAddress(new InetSocketAddress("203.0.113.9", 443)));
        assertThat(resolver.resolve(anonymous).block()).isEqualTo("ip:203.0.113.9");
    }
}
