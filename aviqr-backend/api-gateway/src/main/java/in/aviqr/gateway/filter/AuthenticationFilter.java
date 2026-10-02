package in.aviqr.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import java.nio.charset.StandardCharsets;

@Component
@Slf4j
public class AuthenticationFilter extends AbstractGatewayFilterFactory<AuthenticationFilter.Config> {

    @Value("${app.jwt.secret}")
    private String jwtSecret;
    @Value("${INTERNAL_SYNC_SECRET:}") private String internalSecret;
    private final org.springframework.web.reactive.function.client.WebClient sessionClient;

    public AuthenticationFilter(org.springframework.web.reactive.function.client.WebClient.Builder sessionWebClientBuilder) {
        super(Config.class); this.sessionClient = sessionWebClientBuilder.build();
    }

    @jakarta.annotation.PostConstruct
    void validateSecret() {
        if (jwtSecret==null || jwtSecret.getBytes(StandardCharsets.UTF_8).length<48 || jwtSecret.startsWith("replace_") || jwtSecret.startsWith("aviqr_super_secret"))
            throw new IllegalStateException("JWT_SECRET must be a random secret of at least 48 bytes; example/default values are forbidden");
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
            if (authHeader == null || !authHeader.startsWith("Bearer ")) return unauthorized(exchange);
            try {
                Claims claims = Jwts.parser()
                        .verifyWith(Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8)))
                        .build().parseSignedClaims(authHeader.substring(7)).getPayload();
                if (!"access".equals(claims.get("tokenType",String.class)) || claims.get("sid",String.class)==null || claims.get("role",String.class)==null)
                    return unauthorized(exchange);
                return sessionClient.post().uri("http://auth-service/api/v1/auth/internal/validate-session")
                    .header("X-Internal-Secret",internalSecret).bodyValue(java.util.Map.of("token",authHeader.substring(7)))
                    .retrieve().bodyToMono(java.util.Map.class).timeout(java.time.Duration.ofSeconds(5))
                    .onErrorReturn(java.util.Map.of("active",false))
                    .flatMap(result -> Boolean.TRUE.equals(result.get("active")) ? chain.filter(exchange.mutate().request(
                        exchange.getRequest().mutate()
                                .header("X-User-Id",    claims.getSubject())
                                .header("X-User-Role",  claims.get("role",   String.class) != null ? claims.get("role",   String.class) : "")
                                .header("X-Shop-Id",    claims.get("shopId", String.class) != null ? claims.get("shopId", String.class) : "")
                                .header("X-Session-Id",claims.get("sid",String.class))
                                .header("X-User-Phone", claims.get("phone",  String.class) != null ? claims.get("phone",  String.class) : "")
                                .build()).build()) : unauthorized(exchange));
            } catch (Exception e) {
                log.warn("JWT validation failed: {}", e.getMessage());
                return unauthorized(exchange);
            }
        };
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        return exchange.getResponse().setComplete();
    }

    public static class Config {}
}
