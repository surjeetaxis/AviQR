package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

/** Rate/category master. hotel-service's Room.roomType (a plain string) is matched
 *  against {@link #name} to derive physical inventory for a given type. */
@Entity @Table(name="pms_room_types") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RoomType {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private String name;
    private String description;
    @Builder.Default private Integer maxOccupancy = 2;
    @Builder.Default private Boolean active = true;
    @CreationTimestamp private LocalDateTime createdAt;
}
