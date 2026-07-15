package in.aviqr.shop.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * MARKET FEATURE: unified customer profile — CRM identity fields not covered
 * by LoyaltyAccount (points/spend) or CustomerFavorite (starred shops).
 *
 * Same lightweight, no-login identity model as LoyaltyAccount/CustomerFavorite:
 * one Customer per (customer phone + shop).
 */
@Entity
@Table(name = "customers",
    uniqueConstraints = @UniqueConstraint(columnNames = {"customerPhone", "shopId"}),
    indexes = {
        @Index(name = "idx_customers_phone_shop", columnList = "customerPhone, shopId"),
        @Index(name = "idx_customers_shop",       columnList = "shopId")
    })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Customer {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String customerPhone;

    @Column(nullable = false)
    private String shopId;

    private String customerName;
    private String email;
    private LocalDate birthday;
    private LocalDate anniversary;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // EAGER: small collection (a handful of labels per customer), always needed
    // whenever a Customer is serialized — avoids LazyInitializationException with
    // spring.jpa.open-in-view=false.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "customer_labels", joinColumns = @JoinColumn(name = "customer_id"))
    @Column(name = "label")
    @Builder.Default
    private List<String> labels = new java.util.ArrayList<>();

    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
}
