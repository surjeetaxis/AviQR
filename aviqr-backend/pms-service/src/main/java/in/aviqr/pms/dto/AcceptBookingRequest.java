package in.aviqr.pms.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

/**
 * Real-world "accept booking" contract used by AxisRooms' own channel-manager
 * integration (accessKey-authenticated, nested Guest/Checkin/Booking/Rates blocks).
 * {@code @JsonIgnoreProperties(ignoreUnknown = true)} everywhere below is deliberate:
 * CreditCardDetails.cvv must never be deserialized or stored, even as a placeholder —
 * only cardHolderNumber (an opaque payment-token reference) and cardType are kept.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AcceptBookingRequest {
    private String accessKey;

    @JsonProperty("GuestDetails")
    private GuestDetails guestDetails;

    @JsonProperty("CheckinDetails")
    private CheckinDetails checkinDetails;

    @JsonProperty("BookingDetails")
    private BookingDetails bookingDetails;

    @JsonProperty("Rates")
    private Rates rates;

    @JsonProperty("CreditCardDetails")
    private CreditCardDetails creditCardDetails;

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GuestDetails {
        private String title;
        private String guestName;
        private String emailId;
        private String mobileNo;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CheckinDetails {
        private String checkInDateTime;   // "dd/MM/yyyy"
        private String checkOutDateTime;  // "dd/MM/yyyy"
        private String totalPax;
        private String children;
        private String amount;
        private String taxes;
        private String totalAmount;
        private String paid;
        private List<String> childrenAge;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class BookingDetails {
        private String hotelID;
        private String bookingNo;
        private String bookingDate;
        private String bookedBy;
        private String ota;
        private String bookingStatus;
        private String bookingSource;
        private String bookingSourceRefId;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Rates {
        private List<RoomTypeLine> roomType;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class RoomTypeLine {
        private String id;
        private String date;
        private String noOfRooms;
        private String ratePlanId;
        @JsonProperty("NoOfPax")
        private String noOfPax;
    }

    // cvv is intentionally not a field here — never deserialized, never stored.
    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CreditCardDetails {
        private String cardHolderNumber;
        private String cardType;
    }
}
