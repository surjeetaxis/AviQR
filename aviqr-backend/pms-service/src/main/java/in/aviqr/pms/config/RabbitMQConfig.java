package in.aviqr.pms.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String ORDERS_EXCHANGE = "aviqr.orders";

    // Publish-only from here — notification-report-review-service declares the same
    // exchange name (and the queue/binding that consumes "pms.balance-due") on its own
    // side, the same fan-out convention as ORDERS_EXCHANGE above. Declaring it here too
    // just makes sure the exchange exists even if pms-service starts before that
    // service does; RabbitMQ treats redeclaring an identical exchange as a no-op.
    public static final String HOTEL_EXCHANGE = "aviqr.hotel";

    // Own queue name — hotel-service already binds a "order.new.room-charge.queue" to
    // this same exchange/routing key for its own RoomCharge ledger; a distinctly-named
    // queue here lets pms-service also receive every order.new event instead of the two
    // consumers competing for the same queue (see hotel-service's RabbitMQConfig for the
    // identical comment — this is a documented fan-out convention in this codebase).
    public static final String ORDER_NEW_QUEUE = "order.new.pms-folio.queue";

    @Bean
    public TopicExchange ordersExchange() { return new TopicExchange(ORDERS_EXCHANGE); }

    @Bean
    public TopicExchange hotelExchange() { return new TopicExchange(HOTEL_EXCHANGE); }

    @Bean
    public Queue orderNewQueue() { return QueueBuilder.durable(ORDER_NEW_QUEUE).build(); }

    @Bean
    public Binding orderBinding() { return BindingBuilder.bind(orderNewQueue()).to(ordersExchange()).with("order.new"); }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() { return new Jackson2JsonMessageConverter(); }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory cf) {
        RabbitTemplate rt = new RabbitTemplate(cf);
        rt.setMessageConverter(messageConverter());
        return rt;
    }
}
