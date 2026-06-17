package in.aviqr.registry.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                // Disable CSRF — stateless dashboard
                .csrf(csrf -> csrf.disable())

                // Disable form login entirely — no more redirect to /login page
                .formLogin(form -> form.disable())

                // Disable HTTP Basic — no browser password popup either
                .httpBasic(basic -> basic.disable())

                // Allow everything — dashboard is open, Eureka peer replication
                // is handled by the URL-level auth in eureka.client.service-url.defaultZone
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().permitAll()
                )
                .build();
    }
}
