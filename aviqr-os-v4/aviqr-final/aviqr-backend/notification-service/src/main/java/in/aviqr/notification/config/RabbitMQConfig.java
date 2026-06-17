package in.aviqr.notification.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {
    public static final String ORDERS_EXCHANGE = "aviqr.orders";
    public static final String HOTEL_EXCHANGE  = "aviqr.hotel";
    public static final String ORDER_NEW_QUEUE = "order.new.queue";
    public static final String HOTEL_REQ_QUEUE = "hotel.request.queue";

    @Bean public TopicExchange ordersExchange() { return new TopicExchange(ORDERS_EXCHANGE); }
    @Bean public TopicExchange hotelExchange()  { return new TopicExchange(HOTEL_EXCHANGE); }
    @Bean public Queue orderNewQueue()  { return QueueBuilder.durable(ORDER_NEW_QUEUE).build(); }
    @Bean public Queue hotelReqQueue()  { return QueueBuilder.durable(HOTEL_REQ_QUEUE).build(); }
    @Bean public Binding orderBinding() { return BindingBuilder.bind(orderNewQueue()).to(ordersExchange()).with("order.new"); }
    @Bean public Binding hotelBinding() { return BindingBuilder.bind(hotelReqQueue()).to(hotelExchange()).with("request.new"); }
    @Bean public Jackson2JsonMessageConverter converter() { return new Jackson2JsonMessageConverter(); }
    @Bean public RabbitTemplate rabbitTemplate(ConnectionFactory cf) {
        RabbitTemplate rt = new RabbitTemplate(cf);
        rt.setMessageConverter(converter());
        return rt;
    }
}
