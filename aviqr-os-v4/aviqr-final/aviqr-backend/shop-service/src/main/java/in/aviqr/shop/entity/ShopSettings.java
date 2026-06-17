package in.aviqr.shop.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity @Table(name="shop_settings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ShopSettings {
    @Id private UUID shopId;

    // Payment gateways
    private String razorpayKeyId;
    private String razorpayKeySecret;
    private String phonePeMerchantId;
    private Boolean cashEnabled;
    private Boolean onlineEnabled;
    private Boolean walletEnabled;

    // Notifications
    private String smtpHost;
    private String smtpUser;
    private String smtpPassword;
    private String twilioSid;
    private String twilioToken;
    private String whatsappApiKey;
    private String fcmServerKey;

    // Loyalty
    private Boolean loyaltyEnabled;
    private Integer loyaltyPointsPerRupee;
    private Integer loyaltyRedemptionRate;

    // GST
    private Double taxPercent;
    private String gstin;
    private String businessName;
}
