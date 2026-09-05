package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** One physical room within a (possibly multi-room) Reservation. roomId is only
 *  assigned once a specific hotel-service Room is picked (at booking time or at
 *  check-in), so it stays nullable until then. */
@Entity @Table(name="pms_room_reservations") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RoomReservation {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID reservationId;
    @Column(nullable=false) private UUID roomTypeId;
    private UUID ratePlanId;
    private UUID roomId;          // hotel-service Room.id, once assigned
    private String roomNumber;    // denormalized once assigned
    @Column(precision=10, scale=2) private BigDecimal ratePerNight;
    private LocalDateTime actualCheckInAt;
    private LocalDateTime actualCheckOutAt;
}
