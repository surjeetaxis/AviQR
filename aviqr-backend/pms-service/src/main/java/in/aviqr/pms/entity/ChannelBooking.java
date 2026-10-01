package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

/** Idempotency record for inbound channel webhooks: a channel manager may retry the
 *  same reservation notification, so (channel, externalBookingId) must map to at
 *  most one Reservation. */
@Entity @Table(name="pms_channel_bookings") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChannelBooking {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private ChannelName channel;
    @Column(nullable=false) private String externalBookingId;
    @Column(nullable=false) private UUID reservationId;
    // For the Channel Bookings list — nullable because rows written before these
    // existed only had channel/externalBookingId/reservationId.
    private UUID hotelId;
    private String ota;              // OTA name as the channel manager reported it
    private String lastStatus;       // confirmed | modified | cancelled
    private LocalDateTime updatedAt; // last notification for this booking
    @CreationTimestamp private LocalDateTime createdAt;
}
