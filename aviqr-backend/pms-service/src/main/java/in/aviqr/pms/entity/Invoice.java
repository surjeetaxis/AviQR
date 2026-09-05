package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** One per reservation, generated at checkout (see ReservationService.checkOut) — a
 *  snapshot of the folio totals under a permanent sequential number. Line items
 *  aren't duplicated here; they're read live from FolioCharge/FolioPayment by
 *  reservationId when rendering, same as the Folio tab does. */
@Entity @Table(name="pms_invoices", uniqueConstraints=@UniqueConstraint(name="pms_invoices_hotel_invoice_number_key", columnNames={"hotelId","invoiceNumber"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Invoice {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID hotelId;
    @Column(nullable=false, unique=true) private UUID reservationId;
    @Column(nullable=false) private String invoiceNumber;
    @Column(precision=10, scale=2, nullable=false) private BigDecimal totalCharges;
    @Column(precision=10, scale=2, nullable=false) private BigDecimal totalPayments;
    @Column(precision=10, scale=2, nullable=false) private BigDecimal balance;
    @CreationTimestamp private LocalDateTime issuedAt;
}
