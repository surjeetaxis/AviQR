package in.aviqr.pms.service;

import in.aviqr.pms.entity.Voucher;
import in.aviqr.pms.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class VoucherService {

    private final VoucherRepository voucherRepo;

    public Voucher issue(UUID hotelId, String code, BigDecimal value) {
        if (voucherRepo.findByHotelIdAndCode(hotelId, code).isPresent())
            throw new RuntimeException("A voucher with code " + code + " already exists for this hotel");
        return voucherRepo.save(Voucher.builder()
            .hotelId(hotelId).code(code).initialValue(value).balance(value).build());
    }

    public List<Voucher> listForHotel(UUID hotelId) {
        return voucherRepo.findByHotelId(hotelId);
    }

    /** Validates and deducts in one step — used when a VOUCHER folio payment is
     *  recorded (see FolioController#addPayment). Throws if the code is unknown,
     *  inactive, or doesn't have enough balance left, so the payment is never
     *  recorded against a voucher that can't actually cover it. */
    @Transactional
    public Voucher redeem(UUID hotelId, String code, BigDecimal amount) {
        if (code == null || code.isBlank())
            throw new RuntimeException("A voucher code is required for a VOUCHER payment");
        Voucher voucher = voucherRepo.findByHotelIdAndCode(hotelId, code)
            .orElseThrow(() -> new RuntimeException("No voucher found with code " + code));
        if (!Boolean.TRUE.equals(voucher.getActive()))
            throw new RuntimeException("Voucher " + code + " is not active");
        if (voucher.getBalance().compareTo(amount) < 0)
            throw new RuntimeException("Voucher " + code + " has insufficient balance (₹" + voucher.getBalance() + " left)");
        voucher.setBalance(voucher.getBalance().subtract(amount));
        return voucherRepo.save(voucher);
    }
}
