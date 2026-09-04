package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A guest wants a room type for specific dates that has no availability right now
 * — a gap found comparing against the legacy CRS, which alerts on availability
 * opening up for waitlisted demand. AviQR had no waitlist concept at all before
 * this; see WaitlistService for how a cancellation/no-show re-checks this list.
 */
@Entity @Table(name="pms_waitlist") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Waitlist {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private UUID roomTypeId;
    @Column(nullable=false) private String guestName;
    private String guestPhone;
    @Column(nullable=false) private LocalDate checkInDate;
    @Column(nullable=false) private LocalDate checkOutDate;
    @Enumerated(EnumType.STRING) @Builder.Default private WaitlistStatus status = WaitlistStatus.WAITING;
    @CreationTimestamp private LocalDateTime createdAt;
    private LocalDateTime notifiedAt;
}
