package in.aviqr.gateway.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.aviqr.gateway.security.PayloadEncryption;
import java.time.Duration;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.http.*;
import org.springframework.http.server.reactive.ServerHttpRequestDecorator;
import org.springframework.stereotype.Component;
import org.springframework.web.server.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@Component
public class PayloadEncryptionFilter implements WebFilter, Ordered {
    private final PayloadEncryption encryption;
    private final ObjectMapper mapper;
    private final ReactiveStringRedisTemplate redis;
    @Value("${app.payload.require-encrypted:false}") private boolean required;
    private static final Set<String> WEBHOOKS = Set.of("/api/v1/payments/razorpay/webhook", "/api/v1/aggregator/zomato/webhook", "/api/v1/aggregator/swiggy/webhook", "/api/v1/pms/channels/webhook", "/api/v1/pms/channels/accept-booking");
    public PayloadEncryptionFilter(PayloadEncryption encryption, ObjectMapper mapper, ReactiveStringRedisTemplate redis) { this.encryption=encryption; this.mapper=mapper; this.redis=redis; }
    @Override public int getOrder() { return -190; }
    @Override public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        var request = exchange.getRequest(); String path = request.getURI().getRawPath();
        var type = request.getHeaders().getContentType();
        if (!path.startsWith("/api/") || (WEBHOOKS.contains(path) || path.startsWith("/api/v1/payments/webhook/")) || request.getMethod() == HttpMethod.GET || request.getMethod() == HttpMethod.HEAD || request.getMethod() == HttpMethod.OPTIONS || type == null || !MediaType.APPLICATION_JSON.isCompatibleWith(type)) return chain.filter(exchange);
        String target = path + (request.getURI().getRawQuery() == null ? "" : "?" + request.getURI().getRawQuery());
        return DataBufferUtils.join(request.getBody(), 1024 * 1024).map(buffer -> {
            byte[] bytes = new byte[buffer.readableByteCount()]; buffer.read(bytes); DataBufferUtils.release(buffer);
            return bytes;
        }).defaultIfEmpty(new byte[0])
          .onErrorResume(e -> reject(exchange, HttpStatus.PAYLOAD_TOO_LARGE).then(Mono.empty()))
          .flatMap(bytes -> {
            if (bytes.length == 0) return chain.filter(exchange);
            return Mono.fromCallable(() -> {
                var json = mapper.readTree(bytes);
                if (json != null && json.has("jwe")) return java.util.Optional.of(encryption.decrypt(json.path("jwe").asText(), request.getMethod().name(), target));
                if (required) throw new IllegalArgumentException("Encrypted JSON is required");
                return java.util.Optional.<com.fasterxml.jackson.databind.JsonNode>empty();
            }).subscribeOn(Schedulers.boundedElastic())
              .onErrorResume(e -> reject(exchange, HttpStatus.BAD_REQUEST).then(Mono.empty()))
              .flatMap(optional -> {
                if (optional.isEmpty()) return forward(exchange, chain, bytes);
                var payload = optional.get();
                return redis.opsForValue().setIfAbsent("payload:jti:" + payload.path("jti").asText(), "1", Duration.ofSeconds(180))
                    .onErrorResume(e -> reject(exchange, HttpStatus.SERVICE_UNAVAILABLE).then(Mono.empty()))
                    .flatMap(fresh -> Boolean.TRUE.equals(fresh) ? forward(exchange, chain, mapperBytes(payload.get("body"))) : reject(exchange, HttpStatus.BAD_REQUEST));
            });
        });
    }
    private byte[] mapperBytes(com.fasterxml.jackson.databind.JsonNode body) {
        try { return mapper.writeValueAsBytes(body); } catch (Exception e) { throw new IllegalArgumentException("Invalid JSON"); }
    }
    private Mono<Void> forward(ServerWebExchange exchange, WebFilterChain chain, byte[] bytes) {
        var request = new ServerHttpRequestDecorator(exchange.getRequest()) {
            @Override public HttpHeaders getHeaders() { var headers = new HttpHeaders(); headers.putAll(super.getHeaders()); headers.remove(HttpHeaders.TRANSFER_ENCODING); headers.setContentLength(bytes.length); return headers; }
            @Override public Flux<org.springframework.core.io.buffer.DataBuffer> getBody() { return Flux.defer(() -> Flux.just(exchange.getResponse().bufferFactory().wrap(bytes))); }
        };
        return chain.filter(exchange.mutate().request(request).build());
    }
    private Mono<Void> reject(ServerWebExchange exchange, HttpStatus status) { exchange.getResponse().setStatusCode(status); return exchange.getResponse().setComplete(); }
}
