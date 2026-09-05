package in.aviqr.hotel.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

/** A two-way message thread, scoped to a room for the length of that stay —
 *  deliberately built alongside GuestServiceRequest rather than a separate
 *  "guest portal" module, since it's the same QR-scan-to-hotel channel a guest
 *  already uses for service requests. */
@Entity @Table(name="guest_messages") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GuestMessage {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private String roomNumber;
    private String guestName;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private MessageSender sender;
    @Column(nullable=false, length=1000) private String message;
    @Builder.Default private Boolean readByStaff = false;
    @CreationTimestamp private LocalDateTime createdAt;
}
