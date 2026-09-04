package in.aviqr.notification.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Covers two review contexts sharing one table: an F&B review (shopId, optionally
 * menuItemId/orderId) and a hotel-stay review (hotelId, optionally reservationId) —
 * exactly one of shopId/hotelId is set per row (enforced by a DB check constraint).
 */
@Entity @Table(name = "reviews") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Review {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    private String shopId;
    private UUID menuItemId;
    private UUID orderId;
    private String hotelId;
    private UUID reservationId;
    private String customerId;
    private String customerName;
    @Column(nullable = false) private Integer rating;
    @Column(columnDefinition = "TEXT") private String comment;
    @CreationTimestamp private LocalDateTime createdAt;
}
