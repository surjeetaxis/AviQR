package in.aviqr.paymentgateway;

import in.aviqr.paymentgateway.gateway.PaymentGateway;
import in.aviqr.paymentgateway.service.GatewayRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:pg;DB_CLOSE_DELAY=-1", "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa", "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=create-drop",
    "eureka.client.enabled=false", "spring.cloud.discovery.enabled=false",
    "internal.sync.secret=test-internal-secret-0123456789abcdef",
    "payment-gateway.credential-key=AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8="})
class ApplicationContextTest {
    @Autowired GatewayRegistry registry;

    @Test
    void everyGatewayHasAProvider() {
        for (PaymentGateway g : PaymentGateway.values()) assertThat(registry.get(g).gateway()).isEqualTo(g);
    }
}
