package in.aviqr.support.config;

import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * support-service only publishes onto the "aviqr.leads" exchange (lead.email.send) —
 * notification-report-review-service's NotificationRabbitConfig owns the exchange/queue
 * declarations, same division of responsibility as auth-service's "aviqr.users" publisher.
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
