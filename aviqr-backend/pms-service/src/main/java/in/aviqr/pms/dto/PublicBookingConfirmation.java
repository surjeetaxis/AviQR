package in.aviqr.pms.dto;

import in.aviqr.pms.entity.Reservation;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Guest-facing confirmation intentionally omits guest phone/name and staff notes.
 *  Totals are what the booking engine showed at booking; taxes are an estimate
 *  because surcharges post to the folio at check-in. */
public record PublicBookingConfirmation(UUID reservationId, UUID hotelId, LocalDate checkInDate,
        LocalDate checkOutDate, String status, Integer rooms, Totals totals, String reference, String voucherToken, Payment payment) {
    /** An online payment the guest is sent to complete; null when they pay at the hotel. */
    public record Payment(UUID paymentId, String payUrl, BigDecimal amount, String currency, String kind, boolean required) { }
    public record Totals(BigDecimal roomTotal, BigDecimal addOnTotal, BigDecimal discount,
                         BigDecimal estimatedTaxes, BigDecimal grandTotal, String currency,
                         BigDecimal voucherApplied, BigDecimal balanceDue) { }

    public static PublicBookingConfirmation from(Reservation r) {
        return new PublicBookingConfirmation(r.getId(),r.getHotelId(),r.getCheckInDate(),r.getCheckOutDate(),r.getStatus().name(),null,null,null,null,null);
    }
    public static PublicBookingConfirmation from(Reservation r, int rooms, Totals totals) {
        return new PublicBookingConfirmation(r.getId(),r.getHotelId(),r.getCheckInDate(),r.getCheckOutDate(),r.getStatus().name(),rooms,totals,null,null,null);
    }
    public PublicBookingConfirmation withVoucher(String reference, String voucherToken) {
        return new PublicBookingConfirmation(reservationId,hotelId,checkInDate,checkOutDate,status,rooms,totals,reference,voucherToken,payment);
    }
    public PublicBookingConfirmation withPayment(Payment payment) {
        return new PublicBookingConfirmation(reservationId,hotelId,checkInDate,checkOutDate,status,rooms,totals,reference,voucherToken,payment);
    }
}
