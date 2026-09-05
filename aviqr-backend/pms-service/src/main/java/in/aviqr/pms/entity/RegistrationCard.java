package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

/** The signed guest registration card captured at (contactless) check-in — the
 *  digital equivalent of the paper Form C / police-register card a guest signs
 *  at an Indian hotel front desk. One per reservation, generated once at
 *  check-in (see ReservationService.preCheckIn/registerSignature). */
@Entity @Table(name="pms_registration_cards") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RegistrationCard {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false, unique=true) private UUID reservationId;
    @Column(nullable=false) private String guestName;
    private String idProofType;
    private String idProofNumber;
    private String address;
    // Base64-encoded PNG data URL of the guest's drawn signature.
    @Column(columnDefinition = "TEXT") private String signatureData;
    @CreationTimestamp private LocalDateTime signedAt;
}
