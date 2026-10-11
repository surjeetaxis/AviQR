package in.aviqr.shop.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

@Entity @Table(name="shop_settings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ShopSettings {
    @Id private UUID shopId;

    // Payment gateways
    private String razorpayKeyId;
    @Convert(converter = in.aviqr.shop.security.RazorpaySecretConverter.class)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(columnDefinition = "text")
    private String razorpayKeySecret;
    @Convert(converter = in.aviqr.shop.security.RazorpaySecretConverter.class)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(columnDefinition = "text")
    private String razorpayWebhookSecret;
    private String phonePeMerchantId;
    private Boolean cashEnabled;
    private Boolean onlineEnabled;
    private Boolean walletEnabled;

    // Notifications
    private String smtpHost;
    private String smtpUser;
    @Convert(converter = in.aviqr.shop.security.RazorpaySecretConverter.class)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(columnDefinition = "text")
    private String smtpPassword;
    private String twilioSid;
    @Convert(converter = in.aviqr.shop.security.RazorpaySecretConverter.class)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(columnDefinition = "text")
    private String twilioToken;
    @Convert(converter = in.aviqr.shop.security.RazorpaySecretConverter.class)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(columnDefinition = "text")
    private String whatsappApiKey;
    @Convert(converter = in.aviqr.shop.security.RazorpaySecretConverter.class)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(columnDefinition = "text")
    private String fcmServerKey;

    // Loyalty
    private Boolean loyaltyEnabled;
    private Integer loyaltyPointsPerRupee;
    private Integer loyaltyRedemptionRate;

    // GST
    private Double taxPercent;
    private String gstin;
    private String businessName;

    // Settlement — nightly auto-settlement of captured payments into a reconciliation
    // batch (payment-service). Null is treated as enabled, matching the market-standard
    // default of auto-settlement being opt-out rather than opt-in.
    private Boolean autoSettlementEnabled;
}
