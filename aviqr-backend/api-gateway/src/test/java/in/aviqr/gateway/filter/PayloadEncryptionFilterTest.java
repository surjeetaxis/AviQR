package in.aviqr.gateway.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.aviqr.gateway.security.PayloadEncryption;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.data.redis.core.ReactiveValueOperations;
import org.springframework.http.MediaType;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.core.io.buffer.DataBufferUtils;
import reactor.core.publisher.Mono;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class PayloadEncryptionFilterTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private PayloadEncryption crypto;
    private ReactiveValueOperations<String,String> values;
    private PayloadEncryptionFilter filter;
    @BeforeEach @SuppressWarnings("unchecked") void setup() throws Exception {
        crypto = mock(PayloadEncryption.class);
        var redis = mock(ReactiveStringRedisTemplate.class);
        values = mock(ReactiveValueOperations.class); when(redis.opsForValue()).thenReturn(values);
        when(crypto.decrypt("ciphertext","POST","/api/v1/auth/login")).thenReturn(mapper.readTree("{\"jti\":\"request-id\",\"body\":{\"password\":\"test-only\"}}"));
        filter = new PayloadEncryptionFilter(crypto,mapper,redis); ReflectionTestUtils.setField(filter,"required",true);
    }
    private MockServerWebExchange request(String path,String body) { return MockServerWebExchange.from(MockServerHttpRequest.post(path).contentType(MediaType.APPLICATION_JSON).body(body)); }
    @Test void decryptsAndRoutesExactlyOnce() {
        when(values.setIfAbsent(eq("payload:jti:request-id"),eq("1"),eq(Duration.ofSeconds(180)))).thenReturn(Mono.just(true));
        var exchange = request("/api/v1/auth/login","{\"jwe\":\"ciphertext\"}"); var count = new AtomicInteger();
        filter.filter(exchange,e -> {
            count.incrementAndGet(); assertThat(e.getRequest().getHeaders().getContentLength()).isEqualTo(24);
            return DataBufferUtils.join(e.getRequest().getBody()).doOnNext(b -> { byte[] bytes=new byte[b.readableByteCount()];b.read(bytes);DataBufferUtils.release(b);assertThat(new String(bytes)).isEqualTo("{\"password\":\"test-only\"}"); }).then();
        }).block();
        assertThat(count.get()).isEqualTo(1);
    }
    @Test void rejectsReplayWithoutRouting() {
        when(values.setIfAbsent(anyString(),anyString(),any(Duration.class))).thenReturn(Mono.just(false));
        var exchange=request("/api/v1/auth/login","{\"jwe\":\"ciphertext\"}");
        filter.filter(exchange,e -> { throw new AssertionError("Must not route replay"); }).block();
        assertThat(exchange.getResponse().getStatusCode().value()).isEqualTo(400);
    }
    @Test void failsClosedWhenReplayStoreIsUnavailable() {
        when(values.setIfAbsent(anyString(),anyString(),any(Duration.class))).thenReturn(Mono.error(new IllegalStateException("offline")));
        var exchange=request("/api/v1/auth/login","{\"jwe\":\"ciphertext\"}");
        filter.filter(exchange,e -> { throw new AssertionError("Must not route without replay check"); }).block();
        assertThat(exchange.getResponse().getStatusCode().value()).isEqualTo(503);
    }
    @Test void rejectsPlaintextAndMalformedJson() {
        for (String body:new String[]{"{\"password\":\"test-only\"}","invalid"}) {
            var exchange=request("/api/v1/auth/login",body);
            filter.filter(exchange,e -> { throw new AssertionError("Must not route plaintext"); }).block();
            assertThat(exchange.getResponse().getStatusCode().value()).isEqualTo(400);
        }
    }
    @Test void localPlaintextCompatibilityRoutesOnlyOnce() {
        ReflectionTestUtils.setField(filter,"required",false);var count=new AtomicInteger();
        filter.filter(request("/api/v1/auth/login","{}"),e -> {count.incrementAndGet();return Mono.empty();}).block();
        assertThat(count.get()).isEqualTo(1);
    }
    @Test void providerWebhookIsNotDecrypted() {
        var count=new AtomicInteger();filter.filter(request("/api/v1/payments/webhook/razorpay","{}"),e -> {count.incrementAndGet();return Mono.empty();}).block();
        assertThat(count.get()).isEqualTo(1);verifyNoInteractions(crypto);
    }
}
