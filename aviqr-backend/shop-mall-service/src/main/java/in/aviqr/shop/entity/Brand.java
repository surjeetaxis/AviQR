package in.aviqr.shop.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

// A Supplier's public brand identity — groups all shops owned by the same
// supplier (matched by ownerId) under one shareable QR / customer-facing page,
// the same role Mall/Hotel play for their vendors/outlets.
@Entity @Table(name="brands")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Brand {
    @Id @GeneratedValue(strategy=GenerationType.UUID)
    private UUID id;

    @Column(nullable=false, unique=true)
    private String ownerId;

    @Column(nullable=false)
    private String name;

    private String logoUrl;
    private String city;

    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
}
