package in.aviqr.paymentgateway.config;

import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestConfig {
    /** Service-to-service calls through Eureka (hotel-service access checks). */
    @Bean @LoadBalanced @Primary
    public RestTemplate restTemplate() { return new RestTemplate(); }

    /** Calls to the payment gateways' own APIs, by real hostname. */
    @Bean
    public RestClient gatewayHttp() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(30_000);
        return RestClient.builder().requestFactory(factory).build();
    }
}
