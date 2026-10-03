package in.aviqr.pms.dto;

import in.aviqr.pms.entity.Reservation;
import java.time.LocalDate;
import java.util.UUID;

/** Guest-facing confirmation intentionally omits guest phone/name and staff notes. */
public record PublicBookingConfirmation(UUID reservationId, UUID hotelId, LocalDate checkInDate,
        LocalDate checkOutDate, String status) {
    public static PublicBookingConfirmation from(Reservation r) {
        return new PublicBookingConfirmation(r.getId(),r.getHotelId(),r.getCheckInDate(),r.getCheckOutDate(),r.getStatus().name());
    }
}
