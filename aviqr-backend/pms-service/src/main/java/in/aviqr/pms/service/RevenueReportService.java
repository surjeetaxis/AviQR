package in.aviqr.pms.service;

import in.aviqr.pms.dto.RevenueRow;
import in.aviqr.pms.repository.FolioChargeRepository;
import in.aviqr.pms.repository.FolioPaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Read-only revenue breakdowns over data already captured by reservations/folios —
 *  no new source of truth, just new views for the "deeper reporting" gap versus
 *  Hotelogix/RMS Cloud's 100+ canned reports. Deliberately just the three highest-
 *  value cuts rather than trying to match that library size. */
@Service @RequiredArgsConstructor
public class RevenueReportService {

    private final FolioChargeRepository chargeRepo;
    private final FolioPaymentRepository paymentRepo;

    public List<RevenueRow> byRoomType(UUID hotelId, LocalDate from, LocalDate to) {
        return chargeRepo.revenueByRoomType(hotelId, from, to);
    }

    public List<RevenueRow> bySource(UUID hotelId, LocalDate from, LocalDate to) {
        return chargeRepo.revenueBySource(hotelId, from, to);
    }

    public List<RevenueRow> byPaymentMethod(UUID hotelId, LocalDate from, LocalDate to) {
        return paymentRepo.revenueByPaymentMethod(hotelId, from.atStartOfDay(), to.plusDays(1).atStartOfDay());
    }
}
