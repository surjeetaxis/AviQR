package in.aviqr.shop.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

// A discount offer admin can draft and then "release" (publish) so it shows up
// live on customer-facing plan pages — created inactive by default so admins can
// prepare an offer ahead of time without it being visible until released.
@Entity @Table(name="offers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Offer {
    @Id @GeneratedValue(strategy=GenerationType.UUID)
    private UUID id;

    @Column(nullable=false)
    private String title;
    private String description;
    private String code; // optional promo code

    @Column(nullable=false)
    private Integer discountPercent; // 0-100

    // "ALL" or a comma-separated list of Plan.planKey values this offer applies to
    @Builder.Default private String applicablePlans = "ALL";

    private LocalDateTime startsAt; // null = starts immediately once released
    private LocalDateTime endsAt;   // null = no end date

    @Builder.Default private Boolean active = false;

    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
}
