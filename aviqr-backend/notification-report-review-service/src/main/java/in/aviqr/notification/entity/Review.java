package in.aviqr.notification.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name = "reviews") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Review {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false) private String shopId;
    private UUID menuItemId;
    private UUID orderId;
    @Column(nullable = false) private String customerId;
    private String customerName;
    @Column(nullable = false) private Integer rating;
    @Column(columnDefinition = "TEXT") private String comment;
    @CreationTimestamp private LocalDateTime createdAt;
}
