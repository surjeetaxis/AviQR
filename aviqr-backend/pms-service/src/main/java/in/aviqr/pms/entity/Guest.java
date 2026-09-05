package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="pms_guests") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Guest {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private String name;
    private String phone;
    private String email;
    private String idProofType;
    private String idProofNumber;
    private String address;
    @Builder.Default private Integer loyaltyPoints = 0;
    @CreationTimestamp private LocalDateTime createdAt;
}
