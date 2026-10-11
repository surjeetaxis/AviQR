package in.aviqr.gateway.filter;
import in.aviqr.gateway.config.ClientIpResolver;
import org.junit.jupiter.api.Test;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.test.util.ReflectionTestUtils;
import java.net.InetSocketAddress;
import static org.assertj.core.api.Assertions.*;
class ClientIpResolverTest {
    @Test void clientCannotSpoofIpBySupplyingForwardedHeader() {
        var ips=new ClientIpResolver();ReflectionTestUtils.setField(ips,"trustedProxies","127.0.0.1");
        var exchange=MockServerWebExchange.from(MockServerHttpRequest.get("/").remoteAddress(new InetSocketAddress("198.51.100.10",1234)).header("X-Forwarded-For","1.2.3.4"));
        assertThat(ips.resolve(exchange)).isEqualTo("198.51.100.10");
    }
    @Test void trustedProxyUsesRightmostPeerRatherThanSpoofedPrefix() {
        var ips=new ClientIpResolver();ReflectionTestUtils.setField(ips,"trustedProxies","127.0.0.1");
        var exchange=MockServerWebExchange.from(MockServerHttpRequest.get("/").remoteAddress(new InetSocketAddress("127.0.0.1",1234)).header("X-Forwarded-For","1.2.3.4, 198.51.100.10"));
        assertThat(ips.resolve(exchange)).isEqualTo("198.51.100.10");
    }
}
