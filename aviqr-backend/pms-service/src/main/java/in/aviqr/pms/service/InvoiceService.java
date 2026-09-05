package in.aviqr.pms.service;

import in.aviqr.pms.entity.Invoice;
import in.aviqr.pms.entity.InvoiceNumberConfig;
import in.aviqr.pms.repository.InvoiceNumberConfigRepository;
import in.aviqr.pms.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Generates a permanent sequential invoice number for a reservation at checkout —
 *  CRS's InvoiceNumberConfig/InvoiceNumberService, without the Bistro/NonBistro POS
 *  split or Spanish-locale formatting variants. */
@Service @RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepo;
    private final InvoiceNumberConfigRepository configRepo;
    private final FolioService folioService;

    /** Idempotent: a reservation already invoiced returns its existing number rather
     *  than burning another sequence value. */
    @Transactional
    public Invoice generateForReservation(UUID hotelId, UUID reservationId) {
        return invoiceRepo.findByReservationId(reservationId).orElseGet(() -> {
            InvoiceNumberConfig config = configRepo.findByHotelId(hotelId)
                .orElseGet(() -> configRepo.save(InvoiceNumberConfig.builder().hotelId(hotelId).build()));
            long sequence = config.getNextSequenceValue();
            config.setNextSequenceValue(sequence + 1);
            configRepo.save(config);

            Map<String, Object> folio = folioService.getFolio(reservationId);
            return invoiceRepo.save(Invoice.builder()
                .hotelId(hotelId).reservationId(reservationId).invoiceNumber(config.format(sequence))
                .totalCharges((BigDecimal) folio.get("totalCharges"))
                .totalPayments((BigDecimal) folio.get("totalPayments"))
                .balance((BigDecimal) folio.get("balance"))
                .build());
        });
    }

    public Invoice get(UUID reservationId) {
        return invoiceRepo.findByReservationId(reservationId)
            .orElseThrow(() -> new RuntimeException("No invoice generated yet for reservation " + reservationId));
    }

    public List<Invoice> listForHotel(UUID hotelId) {
        return invoiceRepo.findByHotelIdOrderByIssuedAtDesc(hotelId);
    }

    public InvoiceNumberConfig getConfig(UUID hotelId) {
        return configRepo.findByHotelId(hotelId)
            .orElseGet(() -> InvoiceNumberConfig.builder().hotelId(hotelId).build());
    }

    public InvoiceNumberConfig updateConfig(UUID hotelId, InvoiceNumberConfig req) {
        InvoiceNumberConfig existing = configRepo.findByHotelId(hotelId)
            .orElseGet(() -> InvoiceNumberConfig.builder().hotelId(hotelId).build());
        existing.setPrefix(req.getPrefix());
        existing.setSuffix(req.getSuffix());
        if (req.getDigitsToSequence() != null) existing.setDigitsToSequence(req.getDigitsToSequence());
        // Deliberately not letting nextSequenceValue be set backwards here — that would
        // let two invoices collide on the same number. A forward jump (e.g. migrating
        // from a prior system's numbering) is still allowed.
        if (req.getNextSequenceValue() != null && req.getNextSequenceValue() > existing.getNextSequenceValue())
            existing.setNextSequenceValue(req.getNextSequenceValue());
        return configRepo.save(existing);
    }
}
