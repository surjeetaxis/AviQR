package in.aviqr.notification.config;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Additional queue bindings for user lifecycle events */
@Configuration
public class NotificationRabbitConfig {
    public static final String USERS_EXCHANGE          = "aviqr.users";
    public static final String USER_REGISTERED_QUEUE   = "user.registered.queue";
    public static final String OTP_REQUESTED_QUEUE     = "otp.requested.queue";

    @Bean public TopicExchange usersExchange()        { return new TopicExchange(USERS_EXCHANGE); }
    @Bean public Queue userRegisteredQueue()           { return QueueBuilder.durable(USER_REGISTERED_QUEUE).build(); }
    @Bean public Binding userRegisteredBinding()       {
        return BindingBuilder.bind(userRegisteredQueue()).to(usersExchange()).with("user.registered");
    }

    @Bean public Queue otpRequestedQueue()             { return QueueBuilder.durable(OTP_REQUESTED_QUEUE).build(); }
    @Bean public Binding otpRequestedBinding()         {
        return BindingBuilder.bind(otpRequestedQueue()).to(usersExchange()).with("otp.requested");
    }

    // ── Sales lead outreach (published by support-service's LeadController,
    // only when a staff member explicitly approves+sends one drafted email) ──
    public static final String LEADS_EXCHANGE          = "aviqr.leads";
    public static final String LEAD_EMAIL_SEND_QUEUE   = "lead.email.send.queue";

    @Bean public TopicExchange leadsExchange()         { return new TopicExchange(LEADS_EXCHANGE); }
    @Bean public Queue leadEmailSendQueue()            { return QueueBuilder.durable(LEAD_EMAIL_SEND_QUEUE).build(); }
    @Bean public Binding leadEmailSendBinding()        {
        return BindingBuilder.bind(leadEmailSendQueue()).to(leadsExchange()).with("lead.email.send");
    }
}
