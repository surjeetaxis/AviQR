package in.aviqr.gateway.filter;

import java.net.InetSocketAddress;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.test.util.ReflectionTestUtils;
import reactor.core.publisher.Mono;
import static org.assertj.core.api.Assertions.assertThat;

class TransportSecurityFilterTest {
    private void verify(String uri, String peer, String proto, boolean required, boolean allowed) {
        var filter = new TransportSecurityFilter();
        ReflectionTestUtils.setField(filter, "requireHttps", required);
        ReflectionTestUtils.setField(filter, "trustedProxies", "127.0.0.1");
        var request = MockServerHttpRequest.post(uri).remoteAddress(new InetSocketAddress(peer, 1234));
        if (proto != null) request.header("X-Forwarded-Proto", proto);
        var exchange = MockServerWebExchange.from(request);
        var routed = new AtomicBoolean();
        filter.filter(exchange, e -> { routed.set(true); return Mono.empty(); }).block();
        assertThat(routed.get()).isEqualTo(allowed);
        if (uri.contains("/api/")) assertThat(exchange.getResponse().getHeaders().getCacheControl()).isEqualTo("no-store");
        if (!allowed) assertThat(exchange.getResponse().getStatusCode().value()).isEqualTo(426);
    }
    @Test void plaintextIsRejectedBeforeRouting() { verify("http://localhost/api/v1/auth/login", "127.0.0.1", null, true, false); }
    @Test void untrustedPeerCannotSpoofTls() { verify("http://localhost/api/v1/auth/login", "198.51.100.2", "https", true, false); }
    @Test void trustedTlsProxyIsAllowed() { verify("http://localhost/api/v1/auth/login", "127.0.0.1", "https", true, true); }
    @Test void ambiguousProtocolIsRejected() { verify("http://localhost/api/v1/auth/login", "127.0.0.1", "https,http", true, false); }
    @Test void directTlsIsAllowed() { verify("https://localhost/api/v1/auth/login", "198.51.100.2", null, true, true); }
    @Test void localDevelopmentIsAllowed() { verify("http://localhost/api/v1/auth/login", "127.0.0.1", null, false, true); }
    @Test void localHealthCheckRemainsAvailable() { verify("http://localhost/actuator/health", "127.0.0.1", null, true, true); }
}
