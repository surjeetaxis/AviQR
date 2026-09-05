package in.aviqr.pms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** A tape-chart / booking-board: physical rooms as rows, each stay rendered as a bar
 *  spanning its check-in..check-out dates. */
@Data @NoArgsConstructor @AllArgsConstructor
public class BookingCalendarResponse {
    private List<RoomRow> rooms;
    private List<StayBar> stays;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class RoomRow {
        private UUID roomId;
        private String roomNumber;
        private String roomType;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class StayBar {
        private UUID reservationId;
        private UUID roomId;
        private String guestName;
        private String status;
        private LocalDate checkInDate;
        private LocalDate checkOutDate;
    }
}
