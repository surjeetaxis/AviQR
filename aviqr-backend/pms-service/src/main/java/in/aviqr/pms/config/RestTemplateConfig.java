package in.aviqr.pms.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class RestTemplateConfig {

    // Eureka-service-discovery calls (hotel-service) — @Primary so existing unqualified
    // @Autowired RestTemplate injection points (HotelServiceClient) keep working unchanged.
    @Bean
    @Primary
    @LoadBalanced
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder.build();
    }

    // Real-hostname calls to an external channel manager's own API — a @LoadBalanced
    // RestTemplate can't resolve a plain external host, so this is a separate bean.
    @Bean("externalRestTemplate")
    public RestTemplate externalRestTemplate(RestTemplateBuilder builder) {
        return builder.setConnectTimeout(Duration.ofSeconds(5)).setReadTimeout(Duration.ofSeconds(10)).build();
    }
}
