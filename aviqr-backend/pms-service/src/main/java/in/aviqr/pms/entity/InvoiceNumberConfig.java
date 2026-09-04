package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

/** Per-hotel sequential invoice numbering — CRS's InvoiceNumberConfig. One row per
 *  hotel; nextSequenceValue is incremented atomically each time an invoice is
 *  generated (see InvoiceService). */
@Entity @Table(name="pms_invoice_number_configs") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InvoiceNumberConfig {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false, unique=true) private UUID hotelId;
    @Builder.Default private String prefix = "";
    @Builder.Default private String suffix = "";
    @Builder.Default private Long nextSequenceValue = 1L;
    @Builder.Default private Integer digitsToSequence = 5;

    public String format(long sequence) {
        String digits = digitsToSequence != null && digitsToSequence > 0
            ? String.format("%0" + digitsToSequence + "d", sequence)
            : String.valueOf(sequence);
        return (prefix == null ? "" : prefix) + digits + (suffix == null ? "" : suffix);
    }
}
