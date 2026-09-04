package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Date-specific override of a RatePlan's baseRate (e.g. weekend/festival pricing) plus
 *  that date's booking restrictions — min/max length-of-stay and closed-to-arrival/
 *  -departure, the same per-date shape OTAs/channel managers use for ARI. price is
 *  nullable: a date can carry only restrictions with no price override. */
@Entity @Table(name="pms_day_prices") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DayPrice {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID ratePlanId;
    @Column(nullable=false) private LocalDate date;
    @Column(precision=10, scale=2) private BigDecimal price;
    // Minimum/maximum nights for a stay ARRIVING on this date. Null = no restriction.
    private Integer minStay;
    private Integer maxStay;
    // Arrival not permitted on this date, e.g. a blackout during a festival.
    @Builder.Default private Boolean closedToArrival = false;
    // Departure not permitted on this date (guests must stay through it).
    @Builder.Default private Boolean closedToDeparture = false;
}
