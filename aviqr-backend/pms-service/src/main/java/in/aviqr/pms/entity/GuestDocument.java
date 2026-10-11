package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/** A scanned guest ID captured at check-in. The image is stored AES-GCM encrypted
 *  (see GuestDocumentService); only metadata is readable without the key. */
@Entity @Table(name="pms_guest_documents") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GuestDocument {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false) private UUID reservationId;
    @Column(nullable=false, length=40) private String docType;
    @Column(nullable=false, length=60) private String contentType;
    @Column(nullable=false) private Integer sizeBytes;
    @Column(nullable=false) private byte[] iv;
    @Basic(fetch=FetchType.LAZY) @Column(nullable=false) private byte[] content;
    @Column(length=64) private String uploadedBy;
    @CreationTimestamp private LocalDateTime createdAt;
}
