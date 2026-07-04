package in.aviqr.notification.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {
    public static final String ORDERS_EXCHANGE      = "aviqr.orders";
    public static final String HOTEL_EXCHANGE       = "aviqr.hotel";
    public static final String STOCK_EXCHANGE       = "aviqr.inventory";

    public static final String ORDER_NEW_QUEUE      = "order.new.queue";
    public static final String ORDER_STATUS_QUEUE   = "order.status.queue";   // ADDED — was missing
    public static final String HOTEL_REQ_QUEUE      = "hotel.request.queue";
    public static final String STOCK_LOW_QUEUE      = "stock.low.queue";      // ADDED

    @Bean public TopicExchange ordersExchange()   { return new TopicExchange(ORDERS_EXCHANGE); }
    @Bean public TopicExchange hotelExchange()    { return new TopicExchange(HOTEL_EXCHANGE); }
    @Bean public TopicExchange stockExchange()    { return new TopicExchange(STOCK_EXCHANGE); }

    @Bean public Queue orderNewQueue()    { return QueueBuilder.durable(ORDER_NEW_QUEUE).build(); }
    @Bean public Queue orderStatusQueue() { return QueueBuilder.durable(ORDER_STATUS_QUEUE).build(); }
    @Bean public Queue hotelReqQueue()    { return QueueBuilder.durable(HOTEL_REQ_QUEUE).build(); }
    @Bean public Queue stockLowQueue()    { return QueueBuilder.durable(STOCK_LOW_QUEUE).build(); }

    @Bean public Binding orderNewBinding()    { return BindingBuilder.bind(orderNewQueue()).to(ordersExchange()).with("order.new"); }
    @Bean public Binding orderStatusBinding() { return BindingBuilder.bind(orderStatusQueue()).to(ordersExchange()).with("order.status"); }
    @Bean public Binding hotelBinding()       { return BindingBuilder.bind(hotelReqQueue()).to(hotelExchange()).with("request.new"); }
    @Bean public Binding stockLowBinding()    { return BindingBuilder.bind(stockLowQueue()).to(stockExchange()).with("stock.low"); }

    @Bean public Jackson2JsonMessageConverter converter() { return new Jackson2JsonMessageConverter(); }
    @Bean public RabbitTemplate rabbitTemplate(ConnectionFactory cf) {
        RabbitTemplate rt = new RabbitTemplate(cf);
        rt.setMessageConverter(converter());
        return rt;
    }
}
// NOTE: aviqr.users exchange + user.registered.queue beans added in NotificationRabbitConfig.java
