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
    // Per-room-type sellable-room count for each date in range — the inventory
    // roll-up row shown above a room type's individual room rows, same idea as the
    // legacy CRS's reservation calendar header counts.
    private List<RoomTypeAvailability> roomTypeAvailability;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class RoomRow {
        private UUID roomId;
        private String roomNumber;
        private String roomType;
        private UUID roomTypeId;
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

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class RoomTypeAvailability {
        private UUID roomTypeId;
        private String roomTypeName;
        private int physicalRoomCount;
        private List<DateAvailability> byDate;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class DateAvailability {
        private LocalDate date;
        private int available;
    }
}
