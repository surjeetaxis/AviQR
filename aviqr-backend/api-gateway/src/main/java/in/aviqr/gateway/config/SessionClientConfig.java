package in.aviqr.gateway.config;
import org.springframework.context.annotation.*;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.web.reactive.function.client.WebClient;
@Configuration
public class SessionClientConfig {
    @Bean @LoadBalanced
    public WebClient.Builder sessionWebClientBuilder() { return WebClient.builder(); }
}
