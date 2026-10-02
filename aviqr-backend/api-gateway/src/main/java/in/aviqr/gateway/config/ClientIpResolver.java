package in.aviqr.gateway.config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import java.util.Arrays;
@Component
public class ClientIpResolver {
    @Value("${app.trusted-proxy-ips:127.0.0.1,::1}") private String trustedProxies;
    public String resolve(ServerWebExchange exchange) {
        var remote=exchange.getRequest().getRemoteAddress();
        String peer=remote!=null ? remote.getAddress().getHostAddress() : "unknown";
        if (Arrays.stream((trustedProxies==null?"":trustedProxies).split(",")).map(String::trim).noneMatch(peer::equals)) return peer;
        String forwarded=exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
        if (forwarded==null || forwarded.isBlank()) return peer;
        // The rightmost address is the peer appended by our trusted reverse proxy.
        String[] chain=forwarded.split(",");String last=chain[chain.length-1].trim();
        return io.netty.util.NetUtil.isValidIpV4Address(last) || io.netty.util.NetUtil.isValidIpV6Address(last) ? last : peer;
    }
}
