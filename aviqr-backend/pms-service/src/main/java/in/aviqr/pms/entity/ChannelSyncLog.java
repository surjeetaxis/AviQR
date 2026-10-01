package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDate;
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
    // What this row covers, so logs can be filtered and the calendar can tell which
    // room types/dates a sync reached. roomTypeIds is a comma-separated list of our
    // RoomType ids (a single push carries every room type of one property). All
    // nullable: rows written before these existed simply don't have them.
    @Enumerated(EnumType.STRING) private SyncType syncType;
    private String externalPropertyId;
    @Column(columnDefinition = "TEXT") private String roomTypeIds;
    private LocalDate dateFrom;
    private LocalDate dateTo;
    // MANUAL (staff pressed sync), AUTO (save with auto-sync), SCHEDULED (periodic
    // job), RESERVATION (a booking/cancellation changed availability), CHANNEL
    // (inbound notification from the channel manager).
    private String triggerSource;
    private String triggeredBy;
    @Column(columnDefinition = "TEXT") private String requestBody;
    @Column(columnDefinition = "TEXT") private String responseBody;
    @CreationTimestamp private LocalDateTime createdAt;
}
