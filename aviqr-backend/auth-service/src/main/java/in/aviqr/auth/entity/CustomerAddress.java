package in.aviqr.auth.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "customer_addresses",
    indexes = @Index(name = "idx_customer_addresses_user_id", columnList = "userId"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CustomerAddress {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private String line1;

    private String line2;

    private String city;
    private String state;
    private String pincode;
    private String phone;

    // Exact device-reported coordinates at the time the address was saved (browser/app
    // geolocation), not a geocode of the typed street address — lets delivery/nearby
    // logic use the real pin rather than trusting free-text line1/line2.
    private Double latitude;
    private Double longitude;

    // Lombok would otherwise generate isDefault()/setDefault(boolean), which Jackson
    // binds to JSON property "default" — force it to serialize as "isDefault".
    @JsonProperty("isDefault")
    @Builder.Default
    @Column(nullable = false)
    private boolean isDefault = false;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}