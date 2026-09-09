package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="pms_channel_sync_logs") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChannelSyncLog {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private ChannelName channel;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private SyncDirection direction;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private SyncStatus status;
    @Column(length=2000) private String message;
    // The actual outbound payload and the channel manager's response (or, for a
    // simulated push with no cmBaseUrl configured, the payload that WOULD have been
    // sent and a note that no live call was made) — `message` stays a one-line
    // summary for the table view, these carry the full request/response for anyone
    // who needs to see exactly what was sent and got back.
    @Column(columnDefinition = "TEXT") private String requestBody;
    @Column(columnDefinition = "TEXT") private String responseBody;
    @CreationTimestamp private LocalDateTime createdAt;
}
