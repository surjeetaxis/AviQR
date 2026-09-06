package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.UUID;

/** A manager-set cap on how many rooms of this type are sellable on a given date,
 *  independent of how many physically exist — e.g. holding 1 room back for walk-ins
 *  or maintenance planning even though it's not actually occupied. Null/absent means
 *  no cap: availability falls back to physical room count minus existing bookings. */
@Entity @Table(name="pms_room_type_inventory") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RoomTypeInventory {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID roomTypeId;
    @Column(nullable=false) private LocalDate date;
    @Column(nullable=false) private Integer allotment;
}
