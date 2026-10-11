package in.aviqr.paymentgateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Auth is enforced by the API Gateway. This service permits all requests.
 * Gateways post their results back as plain forms, so CSRF is off for /public/.
 */
@org.springframework.context.annotation.Import(in.aviqr.security.ServiceTrustConfiguration.class)
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf
                .ignoringRequestMatchers("/api/v1/payment-gateway/public/**")
                .ignoringRequestMatchers(request -> Boolean.TRUE.equals(request.getAttribute("aviqr.authenticatedService"))))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            .build();
    }
}
