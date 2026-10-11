package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/** A request for a group quote from the booking engine (more rooms than online checkout takes,
 *  weddings, corporate events). Staff quote it, then turn it into a ReservationGroup. */
@Entity @Table(name="pms_group_enquiries") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GroupEnquiry {
    public static final java.util.Set<String> STATUSES = java.util.Set.of("NEW", "QUOTED", "WON", "LOST");

    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false, length=120) private String organizerName;
    @Column(nullable=false, length=32) private String organizerPhone;
    @Column(length=254) private String organizerEmail;
    @Column(length=120) private String company;
    /** WEDDING, CORPORATE, CONFERENCE, TOUR, SPORTS, OTHER. */
    @Column(length=16) private String eventType;
    @Column(nullable=false) private LocalDate checkInDate;
    @Column(nullable=false) private LocalDate checkOutDate;
    @Column(nullable=false) private Integer rooms;
    private Integer guests;
    @Column(length=1000) private String message;
    @Column(length=8) @Builder.Default private String status = "NEW";
    /** The reservation group made from this enquiry. */
    private UUID groupId;
    @Column(length=500) private String staffNotes;
    @CreationTimestamp private LocalDateTime createdAt;
}
