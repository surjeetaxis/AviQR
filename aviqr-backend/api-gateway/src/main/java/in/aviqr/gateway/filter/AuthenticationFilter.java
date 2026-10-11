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
    @org.springframework.beans.factory.annotation.Autowired(required=false) private in.aviqr.identity.ServiceIdentity signer;
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
                return internal("/api/v1/auth/internal/validate-session",java.util.Map.of("token",authHeader.substring(7)))
                    .retrieve().bodyToMono(java.util.Map.class).timeout(java.time.Duration.ofSeconds(5))
                    .onErrorReturn(java.util.Map.of("active",false))
                    .flatMap(result -> Boolean.TRUE.equals(result.get("active")) ? authorizeSensitive(exchange,claims).flatMap(allowed -> allowed ? chain.filter(exchange.mutate().request(
                        exchange.getRequest().mutate()
                                .header("X-User-Id",    claims.getSubject())
                                .header("X-User-Role",  claims.get("role",   String.class) != null ? claims.get("role",   String.class) : "")
                                .header("X-Shop-Id",    claims.get("shopId", String.class) != null ? claims.get("shopId", String.class) : "")
                                .header("X-Session-Id",claims.get("sid",String.class))
                                .header("X-User-Phone", claims.get("phone",  String.class) != null ? claims.get("phone",  String.class) : "")
                                .build()).build()) : stepUpRequired(exchange)) : unauthorized(exchange));
            } catch (Exception e) {
                log.warn("JWT validation failed: {}", e.getMessage());
                return unauthorized(exchange);
            }
        };
    }

    static boolean sensitive(String method,String path) {
        if(java.util.Set.of("GET","HEAD","OPTIONS").contains(method))return false;
        return path.startsWith("/api/v1/auth/admin/") || path.startsWith("/api/v1/auth/security/sessions/") ||
            path.equals("/api/v1/auth/passkeys/registration/options") || (path.startsWith("/api/v1/auth/passkeys/") && "DELETE".equals(method)) ||
            path.matches("/api/v1/payments/[^/]+/(refund|capture)") || path.matches("/api/v1/hotels/[^/]+/access(?:/.*)?") ||
            path.matches("/api/v1/pms/reservations/[^/]+/pre-auth(?:/capture)?") || (path.startsWith("/api/v1/staff") || path.matches("/api/v1/shops/[^/]+/staff(?:/.*)?") || path.equals("/api/v1/support/impersonate")) || path.endsWith("/change-password") || path.endsWith("/deactivate");
    }
    private org.springframework.web.reactive.function.client.WebClient.RequestHeadersSpec<?> internal(String path,java.util.Map<String,String> payload){
        byte[] bytes;try{bytes=new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsBytes(payload);}catch(Exception e){throw new IllegalStateException(e);}
        var request=sessionClient.post().uri("http://auth-service"+path).header("X-Internal-Secret",internalSecret).contentType(org.springframework.http.MediaType.APPLICATION_JSON);
        if(signer!=null){String assertion=signer.sign("auth-service","POST",path,bytes,java.util.Map.of());if(assertion!=null)request.header("X-Service-Assertion",assertion);}
        return request.bodyValue(bytes);
    }
    private Mono<Boolean> authorizeSensitive(ServerWebExchange exchange,Claims claims) {
        String method=exchange.getRequest().getMethod().name(),path=exchange.getRequest().getURI().getRawPath();
        if(!sensitive(method,path))return Mono.just(true);
        String proof=exchange.getRequest().getHeaders().getFirst("X-Step-Up-Token");
        if(proof==null)return Mono.just(false);
        String query=exchange.getRequest().getURI().getRawQuery();String target=path+(query==null?"":"?"+query);
        String ip=exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
        return internal("/api/v1/auth/internal/consume-step-up",java.util.Map.of("userId",claims.getSubject(),"sessionId",claims.get("sid",String.class),"token",proof,"method",method,"target",target,"ip",ip==null?"unknown":ip))
            .retrieve().bodyToMono(java.util.Map.class).timeout(java.time.Duration.ofSeconds(5)).map(r->Boolean.TRUE.equals(r.get("active"))).onErrorReturn(false);
    }
    private Mono<Void> stepUpRequired(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.PRECONDITION_REQUIRED);
        exchange.getResponse().getHeaders().setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        return exchange.getResponse().writeWith(Mono.just(exchange.getResponse().bufferFactory().wrap(
            "{\"message\":\"Fresh verification required\",\"requiresStepUp\":true}".getBytes(StandardCharsets.UTF_8))));
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        return exchange.getResponse().setComplete();
    }

    public static class Config {}
}
