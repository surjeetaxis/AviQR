package in.aviqr.order.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String ORDERS_EXCHANGE    = "aviqr.orders";
    public static final String HOTEL_EXCHANGE     = "aviqr.hotel";
    public static final String OCR_EXCHANGE       = "aviqr.ocr";
    public static final String NOTIF_EXCHANGE     = "aviqr.notifications";

    public static final String HOTEL_REQ_QUEUE    = "hotel.request.queue";
    public static final String OCR_APPROVED_QUEUE = "ocr.approved.queue";
    public static final String NOTIF_QUEUE        = "notification.queue";

    @Bean
    public TopicExchange ordersExchange() { return new TopicExchange(ORDERS_EXCHANGE); }

    @Bean
    public TopicExchange hotelExchange()  { return new TopicExchange(HOTEL_EXCHANGE); }

    @Bean
    public TopicExchange ocrExchange()    { return new TopicExchange(OCR_EXCHANGE); }

    @Bean
    public Queue hotelReqQueue()    { return QueueBuilder.durable(HOTEL_REQ_QUEUE).build(); }

    @Bean
    public Queue ocrApprovedQueue() { return QueueBuilder.durable(OCR_APPROVED_QUEUE).build(); }

    // No order.new queue/binding here: this service only publishes order.new
    // (see OrderService.createOrder), it never consumes it. Each real consumer
    // (notification-report-review-service, menu-ocr-service, hotel-service)
    // declares its own distinctly-named queue bound to ordersExchange() with
    // routing key "order.new" — see the comment in their RabbitMQConfig for why
    // a shared queue name would break delivery (competing consumers).

    @Bean
    public Binding hotelBinding()  { return BindingBuilder.bind(hotelReqQueue()).to(hotelExchange()).with("request.new"); }

    @Bean
    public Binding ocrBinding()    { return BindingBuilder.bind(ocrApprovedQueue()).to(ocrExchange()).with("menu.items.approved"); }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() { return new Jackson2JsonMessageConverter(); }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory cf) {
        RabbitTemplate rt = new RabbitTemplate(cf);
        rt.setMessageConverter(messageConverter());
        return rt;
    }
}
