package in.aviqr.pms.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** A guest's booking voucher. Reached only with the reservation's voucher token, so
 *  it shows the guest name but never the phone, full email, room number or staff notes. */
public record PublicVoucher(UUID reservationId, String reference, UUID hotelId, String status,
        String guestName, LocalDate checkInDate, LocalDate checkOutDate, Integer adults, Integer children,
        String specialRequests, List<Room> rooms, List<Charge> extras,
        BigDecimal roomTotal, BigDecimal extrasTotal, BigDecimal taxes, boolean taxesEstimated,
        BigDecimal grandTotal, String currency, LocalDateTime bookedAt, String voucherToken, String emailHint) {
    public record Room(String roomType, String ratePlan, String mealPlan, String cancellationPolicy,
                       String floor, String side, String view, BigDecimal ratePerNight) { }
    public record Charge(String type, String description, BigDecimal amount) { }
}
