package in.aviqr.pms.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/** One channel sync event (an ARI push or an inbound booking), stored in MongoDB
 *  (aviqr_logs.pms_channel_sync_logs) — high volume with large request/response
 *  bodies, and only ever read newest-first per hotel. Indexes and the TTL that
 *  expires old rows are created by ChannelSyncLogMongoSetup. */
@Document(collection = "pms_channel_sync_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChannelSyncLog {
    @Id @Builder.Default private UUID id = UUID.randomUUID();
    private UUID hotelId;
    private ChannelName channel;
    private SyncDirection direction;
    private SyncStatus status;
    private String message;
    // What this row covers, so logs can be filtered and the calendar can tell which
    // room types/dates a sync reached. roomTypeIds is a comma-separated list of our
    // RoomType ids (a single push carries every room type of one property). All
    // nullable: rows copied from the old Postgres table may not have them.
    private SyncType syncType;
    private String externalPropertyId;
    private String roomTypeIds;
    private LocalDate dateFrom;
    private LocalDate dateTo;
    // MANUAL (staff pressed sync), AUTO (save with auto-sync), SCHEDULED (periodic
    // job), RESERVATION (a booking/cancellation changed availability), CHANNEL
    // (inbound notification from the channel manager).
    private String triggerSource;
    private String triggeredBy;
    // The actual outbound payload and the channel manager's response (or, for a
    // simulated push with no cmBaseUrl configured, the payload that WOULD have been
    // sent and a note that no live call was made).
    private String requestBody;
    private String responseBody;
    @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
