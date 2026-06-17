package in.aviqr.mall.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity @Table(name="vendors") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Vendor {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID mallId;
    @Column(nullable=false) private String name;
    private String category; private String floor; private String contact;
    private String shopId; // link to shop in shop-service
    @Builder.Default private Boolean active = true;
    @Builder.Default private Boolean qrActive = true;
}