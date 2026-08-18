package in.aviqr.auth.config;

import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * auth-service only publishes onto the "aviqr.users" exchange (user.registered,
 * otp.requested) — notification-report-review-service's NotificationRabbitConfig owns the
 * exchange/queue declarations. Without this converter, RabbitTemplate falls back to Java
 * serialization, which every consumer here rejects since they all deserialize as JSON
 * (Jackson2JsonMessageConverter) — matches the same bean every other publishing service
 * (order-qr-service, hotel-service, menu-ocr-service) already declares.
 */
@Configuration
public class RabbitMQConfig {
    @Bean public Jackson2JsonMessageConverter converter() { return new Jackson2JsonMessageConverter(); }

    @Bean public RabbitTemplate rabbitTemplate(ConnectionFactory cf) {
        RabbitTemplate rt = new RabbitTemplate(cf);
        rt.setMessageConverter(converter());
        return rt;
    }
}
