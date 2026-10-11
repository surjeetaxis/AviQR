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
    public static final String PAY_AT_HOTEL = "PAY_AT_HOTEL", OPTIONAL = "OPTIONAL", REQUIRED = "REQUIRED";

    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false, unique=true) private UUID hotelId;
    @Column(columnDefinition="text") private String hotelPolicies;
    @Column(columnDefinition="text") private String cancellationPolicy;
    @Column(columnDefinition="text") private String termsAndConditions;
    @Builder.Default private Boolean requireTermsAcceptance = true;
    /** PAY_AT_HOTEL, OPTIONAL (guest may pay online) or REQUIRED (an online deposit secures the booking). */
    @Column(length=16) @Builder.Default private String paymentMode = PAY_AT_HOTEL;
    /** Share of the amount due taken online as the deposit, 1-100. */
    @Builder.Default private Integer depositPercent = 100;
    /** The booking assistant chat on the booking page. */
    @Builder.Default private Boolean chatEnabled = false;
    /** Shown as a WhatsApp chat button, digits with country code (e.g. 919876543210). */
    @Column(length=20) private String whatsappNumber;
    /** The booking assistant answers WhatsApp messages to this hotel's WhatsApp Business number. */
    @Builder.Default private Boolean whatsappBotEnabled = false;
    /** Meta WhatsApp Cloud API phone number id the hotel's messages arrive on. */
    @Column(length=40, unique=true) private String whatsappPhoneNumberId;
    /** Meta access token, SecretBox ciphertext. Write-only through the API. */
    @com.fasterxml.jackson.annotation.JsonProperty(access=com.fasterxml.jackson.annotation.JsonProperty.Access.WRITE_ONLY)
    @Column(columnDefinition="text") private String whatsappAccessToken;

    /** Whether a WhatsApp access token is saved (the token itself is never returned). */
    public boolean isWhatsappTokenSet() { return whatsappAccessToken != null && !whatsappAccessToken.isBlank(); }
    @UpdateTimestamp private LocalDateTime updatedAt;

    /** Guests must tick "I agree" only when there are terms to agree to. */
    public boolean termsRequired() {
        return Boolean.TRUE.equals(requireTermsAcceptance) && termsAndConditions != null && !termsAndConditions.isBlank();
    }
}
