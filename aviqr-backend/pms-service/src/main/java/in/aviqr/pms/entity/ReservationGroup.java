package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/** A block of rooms booked together (wedding, corporate event, tour group) — each room
 *  is still its own Reservation (own guest name, own room, own check-in/out), tagged
 *  with this group's id, so per-guest folios stay intact while group actions (bulk
 *  check-in/out, a shared/aggregate folio) operate across every member at once. */
@Entity @Table(name="pms_reservation_groups") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReservationGroup {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private String name;
    private String organizerName;
    private String organizerPhone;
    private String organizerEmail;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private String notes;
    private String createdBy;
    @CreationTimestamp private LocalDateTime createdAt;
}
