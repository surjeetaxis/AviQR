package in.aviqr.hotel.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.*;

@Entity @Table(name="hotels") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Hotel {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private String name;
    private String ownerId; private String phone; private String email;
    // Set when this property belongs to a multi-property Chain — see ChainController.
    private UUID chainId;
    private String address; private String city; private String logoUrl;
    private Double latitude; private Double longitude;
    private Integer totalRooms;
    private String checkInTime; private String checkOutTime;
    private String subscriptionPlan;
    @Builder.Default private Boolean active = true;

    // AviQR OTA and direct booking-engine storefront configuration. Existing and
    // newly created properties default to enabled public listings.
    @Builder.Default private Boolean bookingEngineEnabled = true;
    @Enumerated(EnumType.STRING) @Builder.Default
    private BookingEngineVisibility bookingEngineVisibility = BookingEngineVisibility.PUBLIC;
    @Column(length=100) private String bookingEngineBrandName;
    @Column(length=7) private String bookingEnginePrimaryColor;
    @Column(length=7) private String bookingEngineAccentColor;
    @Column(length=1000) private String bookingEngineLogoUrl;
    @Column(length=63, unique=true) private String bookingEngineSlug;
    @Column(length=253, unique=true) private String bookingEngineCustomDomain;
    @Column(length=254) private String bookingEngineSupportEmail;

    // Proper @CollectionTable with explicit joinColumn so Hibernate knows the FK
    @ElementCollection(fetch = jakarta.persistence.FetchType.EAGER)
    @CollectionTable(name="hotel_enabled_services", joinColumns=@JoinColumn(name="hotel_id"))
    @Column(name="enabled_services")
    @Builder.Default private List<String> enabledServices = new ArrayList<>();

    @CreationTimestamp private LocalDateTime createdAt;
}
