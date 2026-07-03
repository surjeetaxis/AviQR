package in.aviqr.hotel.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** A slot-based booking at a bookable outlet (spa treatment, activity, table reservation). */
@Entity @Table(name="outlet_bookings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OutletBooking {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private UUID outletId;
    private String outletName;

    @Column(nullable=false) private String roomNumber;
    private String guestName;
    private String guestPhone;

    @Column(nullable=false) private String serviceName;   // "Swedish Massage 60min", "Table for 4"
    @Column(precision=10, scale=2) private BigDecimal price;

    @Column(nullable=false) private String bookingDate;   // ISO date
    @Column(nullable=false) private String bookingTime;   // "15:30"
    @Builder.Default private Integer partySize = 1;

    private String notes;

    @Enumerated(EnumType.STRING) @Builder.Default
    private BookingStatus status = BookingStatus.REQUESTED;

    // How the guest chose to pay
    @Enumerated(EnumType.STRING) @Builder.Default
    private PaymentChoice paymentChoice = PaymentChoice.CHARGE_TO_ROOM;

    @CreationTimestamp private LocalDateTime createdAt;
    private LocalDateTime confirmedAt;
}
