package in.aviqr.shop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Merged view of Customer profile fields + LoyaltyAccount stats, keyed by phone. */
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CustomerProfileResponse {
    private String customerPhone;
    private String customerName;
    private String email;
    private LocalDate birthday;
    private LocalDate anniversary;
    private String notes;
    private List<String> labels;

    private Integer totalPoints;
    private Integer lifetimePoints;
    private Integer totalOrders;
    private Integer totalVisits;
    private BigDecimal totalSpent;
    private LocalDateTime lastVisitAt;
}
