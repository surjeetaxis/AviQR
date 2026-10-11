package in.aviqr.gateway.filter;

import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.config.GlobalCorsProperties;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import reactor.core.publisher.Mono;
import static org.assertj.core.api.Assertions.*;

class ApiCorsFilterTest {
    private ApiCorsFilter filter() {
        var properties=new GlobalCorsProperties();var config=new CorsConfiguration();
        config.setAllowedOrigins(java.util.List.of("https://aviqr.com"));config.setAllowedMethods(java.util.List.of("GET","POST","OPTIONS"));config.setAllowedHeaders(java.util.List.of("*"));config.setAllowCredentials(true);
        properties.getCorsConfigurations().put("/**",config);return new ApiCorsFilter(properties);
    }
    @Test void publicKeyAndEarlyErrorsReceiveAllowedOriginHeaders() {
        var exchange=MockServerWebExchange.from(MockServerHttpRequest.get("https://api.aviqr.com/api/v1/security/payload-key").header("Origin","https://aviqr.com"));
        filter().filter(exchange,e -> Mono.empty()).block();
        assertThat(exchange.getResponse().getHeaders().getAccessControlAllowOrigin()).isEqualTo("https://aviqr.com");
    }
    @Test void unapprovedOriginsAreRejected() {
        var exchange=MockServerWebExchange.from(MockServerHttpRequest.get("https://api.aviqr.com/api/v1/security/payload-key").header("Origin","https://attacker.example"));
        filter().filter(exchange,e -> {throw new AssertionError("Must not route forbidden origin");}).block();
        assertThat(exchange.getResponse().getStatusCode().value()).isEqualTo(403);
    }
}
