package in.aviqr.hotel.dto;

import in.aviqr.hotel.entity.Hotel;
import java.util.List;
import java.util.UUID;

/** Fields safe for the public OTA property directory; owner contacts are excluded. */
public record PublicHotelListing(UUID id, String name, String address, String city, String logoUrl,
                                 Double latitude, Double longitude, Integer totalRooms,
                                 String checkInTime, String checkOutTime, List<String> amenities) {
    public static PublicHotelListing from(Hotel hotel) {
        return new PublicHotelListing(hotel.getId(), hotel.getName(), hotel.getAddress(), hotel.getCity(),
            hotel.getLogoUrl(), hotel.getLatitude(), hotel.getLongitude(), hotel.getTotalRooms(),
            hotel.getCheckInTime(), hotel.getCheckOutTime(), hotel.getEnabledServices());
    }
}
