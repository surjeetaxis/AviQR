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
    @CreationTimestamp private LocalDateTime createdAt;
}
