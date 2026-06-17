package in.aviqr.qr.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="qr_scan_logs") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class QrScanLog {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private String qrCode;
    private String ipAddress;
    private String userAgent;
    private LocalDateTime scannedAt;
}