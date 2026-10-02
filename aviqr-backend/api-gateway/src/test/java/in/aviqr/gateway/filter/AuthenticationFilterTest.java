package in.aviqr.gateway.filter;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.http.*;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.*;
import reactor.core.publisher.Mono;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import static org.assertj.core.api.Assertions.*;
class AuthenticationFilterTest {
    private static final String KEY="test-only-signing-key-at-least-forty-eight-characters-long";
    private String token(String type) {
        return Jwts.builder().subject(UUID.randomUUID().toString()).claim("role","ADMIN").claim("sid",UUID.randomUUID().toString()).claim("tokenType",type)
            .expiration(new Date(System.currentTimeMillis()+60000)).signWith(Keys.hmacShaKeyFor(KEY.getBytes(StandardCharsets.UTF_8))).compact();
    }
    private AuthenticationFilter filter(boolean active) {
        var builder=WebClient.builder().exchangeFunction(request->{
            assertThat(request.headers().getFirst("X-Internal-Secret")).isEqualTo("internal-secret");
            return Mono.just(ClientResponse.create(HttpStatus.OK).header("Content-Type","application/json").body("{\"active\":"+active+"}").build());
        });
        var filter=new AuthenticationFilter(builder);ReflectionTestUtils.setField(filter,"jwtSecret",KEY);ReflectionTestUtils.setField(filter,"internalSecret","internal-secret");return filter;
    }
    @Test void revokedSessionIsRejectedEvenWithValidSignedJwt() {
        var exchange=MockServerWebExchange.from(MockServerHttpRequest.get("/api/v1/auth/profile").header("Authorization","Bearer "+token("access")));
        var called=new AtomicBoolean();filter(false).apply(new AuthenticationFilter.Config()).filter(exchange,next->{called.set(true);return Mono.empty();}).block();
        assertThat(called.get()).isFalse();assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
    @Test void refreshTokenCannotBeUsedAsAccessToken() {
        var exchange=MockServerWebExchange.from(MockServerHttpRequest.get("/api/v1/auth/profile").header("Authorization","Bearer "+token("refresh")));
        var called=new AtomicBoolean();filter(true).apply(new AuthenticationFilter.Config()).filter(exchange,next->{called.set(true);return Mono.empty();}).block();
        assertThat(called.get()).isFalse();assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
    @Test void activeSessionGetsIdentityFromSignedClaims() {
        var exchange=MockServerWebExchange.from(MockServerHttpRequest.get("/api/v1/auth/profile").header("Authorization","Bearer "+token("access")));
        var called=new AtomicBoolean();filter(true).apply(new AuthenticationFilter.Config()).filter(exchange,next->{
            called.set(true);assertThat(next.getRequest().getHeaders().getFirst("X-User-Role")).isEqualTo("ADMIN");
            assertThat(next.getRequest().getHeaders().getFirst("X-Session-Id")).isNotBlank();return Mono.empty();}).block();
        assertThat(called.get()).isTrue();
    }
    @Test void boundaryStripsForgedIdentityAndInternalCredentials() {
        var filter=new ServiceBoundaryFilter(new in.aviqr.gateway.config.ClientIpResolver());ReflectionTestUtils.setField(filter,"secret","gateway-secret");
        var exchange=MockServerWebExchange.from(MockServerHttpRequest.get("/api/v1/auth/login").header("X-User-Role","ADMIN").header("X-Internal-Secret","attacker").header("X-Gateway-Secret","attacker"));
        filter.filter(exchange,next->{
            assertThat(next.getRequest().getHeaders().getFirst("X-User-Role")).isNull();
            assertThat(next.getRequest().getHeaders().getFirst("X-Internal-Secret")).isNull();
            assertThat(next.getRequest().getHeaders().getFirst("X-Gateway-Secret")).isNull();return Mono.empty();}).block();
    }
    @Test void internalEndpointsAreNeverPubliclyRouted() {
        var filter=new ServiceBoundaryFilter(new in.aviqr.gateway.config.ClientIpResolver());var exchange=MockServerWebExchange.from(MockServerHttpRequest.post("/api/v1/auth/internal/impersonation-token"));
        var called=new AtomicBoolean();filter.filter(exchange,next->{called.set(true);return Mono.empty();}).block();
        assertThat(called.get()).isFalse();assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
