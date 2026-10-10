package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/** One per hotel: what guests see and agree to on the public booking engine.
 *  cancellationPolicy is the hotel-wide default; a rate plan's own policy wins where set. */
@Entity @Table(name="pms_booking_engine_settings") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BookingEngineSettings {
    public static final int MAX_TEXT = 10_000;

    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false, unique=true) private UUID hotelId;
    @Column(columnDefinition="text") private String hotelPolicies;
    @Column(columnDefinition="text") private String cancellationPolicy;
    @Column(columnDefinition="text") private String termsAndConditions;
    @Builder.Default private Boolean requireTermsAcceptance = true;
    @UpdateTimestamp private LocalDateTime updatedAt;

    /** Guests must tick "I agree" only when there are terms to agree to. */
    public boolean termsRequired() {
        return Boolean.TRUE.equals(requireTermsAcceptance) && termsAndConditions != null && !termsAndConditions.isBlank();
    }
}
