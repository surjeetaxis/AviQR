package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="pms_reservations") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Reservation {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    private UUID guestId;
    // Set when this reservation is one room-booking within a ReservationGroup (a
    // wedding block, corporate booking, ...) — null for an ordinary standalone booking.
    private UUID groupId;
    // Set when a travel agent sourced this booking — drives ReservationCommission,
    // see CommissionService.
    private UUID agentId;
    // Denormalized so front-desk lists don't need a join for the common case
    private String guestName;
    private String guestPhone;
    @Column(nullable=false) private LocalDate checkInDate;
    @Column(nullable=false) private LocalDate checkOutDate;
    @Builder.Default private Integer adults = 1;
    @Builder.Default private Integer children = 0;
    @Enumerated(EnumType.STRING) @Builder.Default private ReservationStatus status = ReservationStatus.BOOKED;
    @Enumerated(EnumType.STRING) @Builder.Default private ReservationSource source = ReservationSource.DIRECT;
    private String notes;
    private String createdBy;
    @CreationTimestamp private LocalDateTime createdAt;
    private LocalDateTime cancelledAt;
    // Guest submitted ID/contact details via the contactless pre-arrival flow —
    // see ContactlessCheckinController — so front-desk can fast-track actual check-in.
    @Builder.Default private Boolean preCheckedIn = false;
    private LocalDateTime preCheckInAt;
}
