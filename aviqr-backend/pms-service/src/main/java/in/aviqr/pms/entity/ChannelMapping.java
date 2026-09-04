package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

/** Links one of our RoomTypes to a channel manager's own property/room-type/rate-plan
 *  identifiers, in both directions: outbound ARI pushes read externalRoomTypeId/
 *  externalRatePlanId to address the channel's inventory, and inbound reservation
 *  webhooks resolve (channel, externalPropertyId, externalRoomTypeId) back to roomTypeId. */
@Entity @Table(name="pms_channel_mappings") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChannelMapping {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private UUID roomTypeId;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private ChannelName channel;
    @Column(nullable=false) private String externalPropertyId;
    @Column(nullable=false) private String externalRoomTypeId;
    private String externalRatePlanId;
    // Generated on creation and given to the hotel to configure as the shared secret
    // in their channel manager's webhook settings — validated on every inbound webhook
    // of the simple generic shape (ChannelController#webhook).
    @Column(nullable=false) private String webhookSecret;

    // Credentials for a real ARI-style channel-manager connection (inventory/
    // bulkPriceUpdate push, accept-booking pull) — provided by the channel manager
    // itself, not generated here. Null/blank cmBaseUrl means "no live connection
    // configured yet", so a push falls back to a log-only simulation.
    private String accessKey;
    private String channelId;
    private String cmBaseUrl;

    @Builder.Default private Boolean active = true;
    @CreationTimestamp private LocalDateTime createdAt;
}
