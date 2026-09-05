package in.aviqr.hotel.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

/** Groups several Hotels an owner runs under one umbrella (see Hotel.chainId) for
 *  chain-wide reporting — CRS's Chain concept. */
@Entity @Table(name="chains") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Chain {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private String name;
    @Column(nullable=false) private String ownerId;
    @CreationTimestamp private LocalDateTime createdAt;
}
