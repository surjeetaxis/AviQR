package in.aviqr.pms.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

/**
 * The booking push the AxisRooms channel manager sends to a connected PMS
 * (its GenericPMSPushBookingModel): accessKey-authenticated, nested
 * Guest/Checkin/Booking/Rates blocks, dates as yyyy-MM-dd. One shape covers new,
 * modified and cancelled bookings — BookingDetails.bookingStatus is "confirmed",
 * "modified" or "cancelled", and a modification carries the complete new booking.
 *
 * {@code @JsonIgnoreProperties(ignoreUnknown = true)} everywhere is deliberate: the
 * payload also carries card fields (creditCardToken/cardNumber) that must never be
 * deserialized or stored here, plus per-PMS extras we don't use.
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

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GuestDetails {
        private String title;
        private String guestName;
        private String emailId;
        private String mobileNo;
        private String countryCode;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CheckinDetails {
        private String checkInDate;       // yyyy-MM-dd
        private String checkOutDate;      // yyyy-MM-dd
        private String totalPax;
        private String adult;
        private String children;
        private String supplierAmount;
        private String taxes;
        private String totalAmount;
        private String paid;
        private String amountToBeCollected;
        private String currency;
        private List<String> specialRequest;
        private List<Integer> childrenAge;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class BookingDetails {
        private String hotelId;
        private String bookingNo;          // the OTA's booking reference
        private String bookingDateTime;    // yyyy-MM-dd HH:mm:ss
        private String modifiedDateTime;
        private String cancelledDateTime;
        private String bookedBy;
        private String ota;                // OTA display name, e.g. "Booking.com"
        private String otaRefId;           // AxisRooms' numeric id for that OTA
        private String bookingStatus;      // confirmed | modified | cancelled
        private String source;
        private String bookingSource;
        private String bookingSourceRefId;
        private String gstNumber;
        private String companyName;
        private String companyAddress;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Rates {
        private List<RoomTypeLine> roomType;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class RoomTypeLine {
        private String id;                 // our externalRoomTypeId on the mapping
        private String ratePlanId;         // our externalRatePlanId on the mapping
        private String ratePlanName;
        private String noOfRooms;
        private String roomWiseAdult;
        private String roomWiseChild;
        private String totalAdults;
        private String totalChildrens;
        private String roomWisePrice;
        private String totalRoomTax;
        private String checkInDate;
        private String checkOutDate;
        private List<DayWiseDetail> dayWiseDetails;
    }

    @Data @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DayWiseDetail {
        private String date;
        private String rate;               // numeric string, or "NA"
        private String tax;
        private String deals;
    }
}
