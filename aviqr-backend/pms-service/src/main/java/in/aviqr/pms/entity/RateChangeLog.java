package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/** One row per changed field on a DayPrice or RoomTypeInventory update — a manager
 *  overwriting a price/restriction/allotment used to just lose the old value with no
 *  trace of who changed what or when. Deliberately field-grained (one row per field,
 *  not one row per save) so "what was the price before it changed" is a direct query,
 *  not a diff of two JSON blobs. */
@Entity @Table(name="pms_rate_change_logs") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RateChangeLog {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    private UUID roomTypeId;
    private UUID ratePlanId;
    @Column(nullable=false) private LocalDate date;
    @Column(nullable=false) private String field;
    private String oldValue;
    private String newValue;
    @Column(nullable=false) private String changedBy;
    @CreationTimestamp private LocalDateTime changedAt;
}
