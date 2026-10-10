package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/** An offer the booking engine applies by itself, without a code: early bird, last minute,
 *  stay longer, or a seasonal sale. Every condition left empty is "any". */
@Entity @Table(name="pms_deals") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Deal {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false, length=80) private String name;
    /** Shown to guests, e.g. "Book 30 days ahead and save". */
    @Column(length=200) private String description;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private ValueType valueType;
    @Column(nullable=false, precision=10, scale=2) private BigDecimal value;
    /** Check-in must fall in this window. */
    private LocalDate stayFrom;
    private LocalDate stayTo;
    /** The booking must be made in this window. */
    private LocalDate bookFrom;
    private LocalDate bookTo;
    private Integer minNights;
    /** Early bird: at least this many days between booking and check-in. */
    private Integer minDaysAhead;
    /** Last minute: at most this many days between booking and check-in. */
    private Integer maxDaysAhead;
    @Builder.Default private Boolean active = true;
    @CreationTimestamp private LocalDateTime createdAt;

    public boolean appliesTo(LocalDate checkIn, LocalDate checkOut, LocalDate today) {
        if (!Boolean.TRUE.equals(active) || checkIn == null || checkOut == null || !checkOut.isAfter(checkIn)) return false;
        long nights = ChronoUnit.DAYS.between(checkIn, checkOut), ahead = ChronoUnit.DAYS.between(today, checkIn);
        return (stayFrom == null || !checkIn.isBefore(stayFrom)) && (stayTo == null || !checkIn.isAfter(stayTo))
            && (bookFrom == null || !today.isBefore(bookFrom)) && (bookTo == null || !today.isAfter(bookTo))
            && (minNights == null || nights >= minNights)
            && (minDaysAhead == null || ahead >= minDaysAhead) && (maxDaysAhead == null || ahead <= maxDaysAhead);
    }

    public BigDecimal discountOn(BigDecimal roomTotal) {
        BigDecimal amount = valueType == ValueType.FIXED ? value
            : roomTotal.multiply(value).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        return amount.min(roomTotal).max(BigDecimal.ZERO);
    }

    /** Still bookable at some point from today: shown on the storefront. */
    public boolean live(LocalDate today) {
        return Boolean.TRUE.equals(active) && (bookTo == null || !today.isAfter(bookTo)) && (stayTo == null || !today.isAfter(stayTo));
    }
}
