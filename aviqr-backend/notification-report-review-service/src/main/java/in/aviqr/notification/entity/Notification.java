package in.aviqr.notification.entity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection="notifications") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {
    @Id private String id;
    private String userId; private String title; private String body;
    private String type; // ORDER_NEW, ORDER_STATUS, PAYMENT, PROMO
    private String shopId; private String orderId; private String referenceId;
    @Builder.Default private boolean read = false;
    private LocalDateTime createdAt;
}