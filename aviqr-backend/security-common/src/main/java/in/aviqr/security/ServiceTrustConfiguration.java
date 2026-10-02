package in.aviqr.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Set;

/** Only the gateway and authenticated service clients may reach business controllers. */
@Configuration
public class ServiceTrustConfiguration {
    private static final Set<String> SERVICES = Set.of("auth-service", "shop-mall-service", "menu-ocr-service",
        "order-qr-service", "payment-service", "hotel-service", "support-service",
        "notification-report-review-service", "pms-service");

    public static boolean matches(String expected, String supplied) {
        return expected != null && !expected.isBlank() && supplied != null &&
            MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), supplied.getBytes(StandardCharsets.UTF_8));
    }

    @Bean
    public FilterRegistrationBean<OncePerRequestFilter> serviceTrustFilter(Environment env) {
        String secret = env.getProperty("internal.sync.secret", env.getProperty("INTERNAL_SYNC_SECRET", ""));
        if (secret.length() < 32 || secret.startsWith("replace_")) throw new IllegalStateException("INTERNAL_SYNC_SECRET must contain at least 32 characters");
        var filter = new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
                    throws ServletException, IOException {
                String path = req.getRequestURI();
                if (path.equals("/actuator/health") || path.startsWith("/actuator/health/")) {
                    chain.doFilter(req, res); return;
                }
                boolean gateway = matches(secret, req.getHeader("X-Gateway-Secret"));
                boolean internal = matches(secret, req.getHeader("X-Internal-Secret"));
                // Internal APIs must never be accessible through a public gateway route.
                if ((!gateway && !internal) || (path.contains("/internal/") && !internal)) {
                    res.sendError(401, "Authenticated service connection required"); return;
                }
                chain.doFilter(req, res);
            }
        };
        var registration = new FilterRegistrationBean<OncePerRequestFilter>(filter);
        registration.setOrder(-200);
        return registration;
    }

    @Bean
    public static BeanPostProcessor internalServiceCredentials(Environment env) {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String name) {
                if (bean instanceof RestTemplate client && !name.equals("externalRestTemplate")) {
                    String secret = env.getProperty("internal.sync.secret", env.getProperty("INTERNAL_SYNC_SECRET", ""));
                    // Only service-discovery hosts receive credentials; never external providers.
                    client.getInterceptors().add(0, (request, body, execution) -> {
                        if (SERVICES.contains(request.getURI().getHost())) {
                            request.getHeaders().set("X-Internal-Secret", secret);
                        }
                        return execution.execute(request, body);
                    });
                }
                return bean;
            }
        };
    }
}
