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

    // Each consumer of "order.new" gets its own queue name — menu-ocr-service
    // (stock deduction) and hotel-service (room-charge posting) also listen to
    // this exchange/routing key with their own distinctly-named queues. Sharing
    // one queue name across services makes RabbitMQ treat them as competing
    // consumers, so each order would only reach ONE of the three at random.
    public static final String ORDER_NEW_QUEUE      = "order.new.notification.queue";
    public static final String ORDER_STATUS_QUEUE   = "order.status.queue";   // ADDED — was missing
    public static final String HOTEL_REQ_QUEUE      = "hotel.request.queue";
    public static final String STOCK_LOW_QUEUE      = "stock.low.queue";      // ADDED
    public static final String PMS_BALANCE_DUE_QUEUE = "pms.balance-due.queue";
    public static final String PMS_REPORT_READY_QUEUE = "pms.report-ready.queue";
    public static final String PMS_WAITLIST_AVAILABLE_QUEUE = "pms.waitlist-available.queue";
    public static final String PMS_REVIEW_INVITE_QUEUE = "pms.review-invite.queue";

    @Bean public TopicExchange ordersExchange()   { return new TopicExchange(ORDERS_EXCHANGE); }
    @Bean public TopicExchange hotelExchange()    { return new TopicExchange(HOTEL_EXCHANGE); }
    @Bean public TopicExchange stockExchange()    { return new TopicExchange(STOCK_EXCHANGE); }

    @Bean public Queue orderNewQueue()    { return QueueBuilder.durable(ORDER_NEW_QUEUE).build(); }
    @Bean public Queue orderStatusQueue() { return QueueBuilder.durable(ORDER_STATUS_QUEUE).build(); }
    @Bean public Queue hotelReqQueue()    { return QueueBuilder.durable(HOTEL_REQ_QUEUE).build(); }
    @Bean public Queue stockLowQueue()    { return QueueBuilder.durable(STOCK_LOW_QUEUE).build(); }
    @Bean public Queue pmsBalanceDueQueue() { return QueueBuilder.durable(PMS_BALANCE_DUE_QUEUE).build(); }
    @Bean public Queue pmsReportReadyQueue() { return QueueBuilder.durable(PMS_REPORT_READY_QUEUE).build(); }
    @Bean public Queue pmsWaitlistAvailableQueue() { return QueueBuilder.durable(PMS_WAITLIST_AVAILABLE_QUEUE).build(); }
    @Bean public Queue pmsReviewInviteQueue() { return QueueBuilder.durable(PMS_REVIEW_INVITE_QUEUE).build(); }

    @Bean public Binding orderNewBinding()    { return BindingBuilder.bind(orderNewQueue()).to(ordersExchange()).with("order.new"); }
    @Bean public Binding orderStatusBinding() { return BindingBuilder.bind(orderStatusQueue()).to(ordersExchange()).with("order.status"); }
    @Bean public Binding hotelBinding()       { return BindingBuilder.bind(hotelReqQueue()).to(hotelExchange()).with("request.new"); }
    @Bean public Binding stockLowBinding()    { return BindingBuilder.bind(stockLowQueue()).to(stockExchange()).with("stock.low"); }
    @Bean public Binding pmsBalanceDueBinding() { return BindingBuilder.bind(pmsBalanceDueQueue()).to(hotelExchange()).with("pms.balance-due"); }
    @Bean public Binding pmsReportReadyBinding() { return BindingBuilder.bind(pmsReportReadyQueue()).to(hotelExchange()).with("pms.report.ready"); }
    @Bean public Binding pmsWaitlistAvailableBinding() { return BindingBuilder.bind(pmsWaitlistAvailableQueue()).to(hotelExchange()).with("pms.waitlist.available"); }
    @Bean public Binding pmsReviewInviteBinding() { return BindingBuilder.bind(pmsReviewInviteQueue()).to(hotelExchange()).with("pms.review-invite"); }

    @Bean public Jackson2JsonMessageConverter converter() { return new Jackson2JsonMessageConverter(); }
    @Bean public RabbitTemplate rabbitTemplate(ConnectionFactory cf) {
        RabbitTemplate rt = new RabbitTemplate(cf);
        rt.setMessageConverter(converter());
        return rt;
    }
}
// NOTE: aviqr.users exchange + user.registered.queue beans added in NotificationRabbitConfig.java
