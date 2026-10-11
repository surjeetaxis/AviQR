package in.aviqr.paymentgateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

/** Hosted online payments for hotels through their own merchant accounts on any of
 *  the gateways ported from the legacy AxisRooms payment-service. */
@SpringBootApplication
@EnableDiscoveryClient
public class PaymentGatewayServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(PaymentGatewayServiceApplication.class, args);
    }
}
