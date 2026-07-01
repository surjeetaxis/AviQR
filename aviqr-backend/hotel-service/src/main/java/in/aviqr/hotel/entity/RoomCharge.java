package in.aviqr.hotel.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="room_charges") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RoomCharge {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private String roomNumber;
    private UUID outletId;
    private String shopId;
    private String orderId;
    private String orderNumber;
    @Column(precision=10, scale=2) private BigDecimal amount;
    private String description;
    @Enumerated(EnumType.STRING) @Builder.Default private RoomChargeStatus status = RoomChargeStatus.PENDING;
    @CreationTimestamp private LocalDateTime createdAt;
    private LocalDateTime settledAt;
    private String settledBy;
    private String guestName;
    @Enumerated(EnumType.STRING) @Builder.Default
    private PaymentChoice paymentChoice = PaymentChoice.CHARGE_TO_ROOM;
    private String paymentRef;   // razorpay/txn id when PAY_DIRECT
}
