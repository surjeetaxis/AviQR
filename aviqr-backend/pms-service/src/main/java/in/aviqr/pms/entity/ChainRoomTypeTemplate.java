package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A chain-level room type definition, pushed to every member hotel's own RoomType
 * by ChainTemplateService — this is a gap found comparing against the legacy CRS's
 * chain module, which lets a chain admin define room types/rates once instead of
 * every property self-managing its own. Not tied to any single hotel; hotelId only
 * appears on the RoomType rows this produces in each property.
 */
@Entity @Table(name="pms_chain_room_type_templates") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChainRoomTypeTemplate {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID chainId;
    @Column(nullable=false) private String name;
    private String description;
    @Builder.Default private Integer maxOccupancy = 2;
    @Builder.Default private Boolean active = true;
    @CreationTimestamp private LocalDateTime createdAt;
}
