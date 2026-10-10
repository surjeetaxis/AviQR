package in.aviqr.pms.dto;

import lombok.Data;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** A prospective guest's self-service booking from the hotel's own direct
 *  booking-engine page. Becomes one DIRECT-source Reservation holding one or more
 *  rooms; no group/agent (those are staff-entered concepts). The single-room
 *  roomTypeId/ratePlanId/roomId fields stay supported for older storefronts. */
@Data
public class PublicBookingRequest {
    private String guestName;
    private String guestPhone;
    private String guestEmail;
    private String specialRequests;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Integer adults;
    private Integer children;
    private UUID roomTypeId;
    private UUID ratePlanId;
    private UUID roomId;
    private List<RoomLine> rooms;
    private List<AddOnLine> addOns;
    private String promoCode;
    private String giftVoucherCode;
    /** The guest ticked "I agree" to the hotel's terms; required when the hotel asks for it. */
    private Boolean termsAccepted;
    /** HOTEL (default), DEPOSIT or FULL: how much to pay online now. */
    private String paymentOption;
    /** Where the payment gateway sends the guest back to (the storefront). */
    private String paymentReturnUrl;
    private UUID bookingRequestId;
    private String storefrontHost;
    private String storefrontSlug;

    @Data
    public static class RoomLine {
        private UUID roomTypeId;
        private UUID ratePlanId;
        private UUID roomId;
    }

    @Data
    public static class AddOnLine {
        private UUID addOnId;
        private Integer quantity;
    }

    public List<RoomLine> roomLines() {
        if (rooms != null && !rooms.isEmpty()) return rooms;
        if (roomTypeId == null) return List.of();
        RoomLine line = new RoomLine();
        line.setRoomTypeId(roomTypeId);
        line.setRatePlanId(ratePlanId);
        line.setRoomId(roomId);
        return List.of(line);
    }
}
