package in.aviqr.menu.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Publisher-side config for the stock.low event InventoryService raises
 * (notification-report-review-service owns that queue/binding — this just
 * declares the same exchange so publishing works even if that service
 * hasn't started yet), plus this service's own queue for consuming
 * order.new events.
 *
 * order.new.inventory.queue is intentionally NOT shared with any other
 * service: notification-report-review-service and hotel-service also listen
 * for order.new, each with their own distinctly-named queue bound to the
 * same aviqr.orders exchange/order.new routing key. A shared queue name
 * would make RabbitMQ treat them as competing consumers, so each order
 * would only reach one of the three services at random instead of all of
 * them.
 */
@Configuration
public class RabbitMQConfig {

    public static final String STOCK_EXCHANGE = "aviqr.inventory";
    public static final String STOCK_LOW_ROUTING_KEY = "stock.low";

    public static final String ORDERS_EXCHANGE = "aviqr.orders";
    public static final String ORDER_NEW_QUEUE = "order.new.inventory.queue";
    public static final String ORDER_NEW_ROUTING_KEY = "order.new";

    @Bean
    public TopicExchange stockExchange() {
        return new TopicExchange(STOCK_EXCHANGE);
    }

    @Bean
    public TopicExchange ordersExchange() {
        return new TopicExchange(ORDERS_EXCHANGE);
    }

    @Bean
    public Queue orderNewQueue() {
        return QueueBuilder.durable(ORDER_NEW_QUEUE).build();
    }

    @Bean
    public Binding orderNewBinding() {
        return BindingBuilder.bind(orderNewQueue()).to(ordersExchange()).with(ORDER_NEW_ROUTING_KEY);
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory cf) {
        RabbitTemplate rt = new RabbitTemplate(cf);
        rt.setMessageConverter(messageConverter());
        return rt;
    }
}
