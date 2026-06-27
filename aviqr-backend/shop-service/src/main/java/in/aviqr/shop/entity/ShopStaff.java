package in.aviqr.shop.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.*;

@Entity @Table(name="shop_staff")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ShopStaff {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;

    @Column(nullable=false)
    private UUID shopId;

    // nullable — staff can be added before they have an account
    private String userId;

    @Column(nullable=false)
    private String name;

    private String phone;
    private String email;
    private String avatar;

    @Enumerated(EnumType.STRING)
    @Builder.Default private StaffRole role = StaffRole.CASHIER;

    @Builder.Default private Boolean active = true;

    // EAGER: this entity is returned directly from the controller (no DTO) with
    // open-in-view disabled, so a LAZY collection throws LazyInitializationException
    // during JSON serialization. The list is small (a handful of permission strings),
    // so eager-loading it is cheap.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name="staff_permissions", joinColumns=@JoinColumn(name="shop_staff_id"))
    @Column(name="permissions")
    @Builder.Default private List<String> permissions = new ArrayList<>();

    @CreationTimestamp private LocalDateTime joinedAt;
}
