package in.aviqr.order.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="qr_codes") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class QrCode {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false, unique=true, length=100) private String qrCode; // unique short code
    @Column(nullable=false, length=2000) private String targetUrl;           // permanent URL
    @Column(nullable=false, length=100) private String shopId;
    private String label;
    @Enumerated(EnumType.STRING) @Builder.Default private QrType type = QrType.SHOP;
    @Column(length=100) private String groupParam; // table number, category id etc.
    @Builder.Default private Long scanCount = 0L;
    @Builder.Default private Boolean active = true;
    @CreationTimestamp private LocalDateTime createdAt;
}