package in.aviqr.pms.dto;

import in.aviqr.pms.client.HotelRoomDto;
import java.util.UUID;

/** Safe public room choice: no room number, guest, or current occupancy is exposed. */
public record PublicAvailableRoomDto(UUID roomId, String floor, String side, String view,
                                     Integer mapX, Integer mapY, String panoramaUrl,
                                     String model3dUrl, String tourVideoUrl, String availabilityStatus) {
    public static PublicAvailableRoomDto from(HotelRoomDto room, boolean available) {
        return new PublicAvailableRoomDto(room.getId(), room.getFloor(), room.getRoomSide(), room.getViewType(),
            coordinate(room.getMapX()), coordinate(room.getMapY()), safeHttps(room.getPanoramaUrl()),
            safeHttps(room.getModel3dUrl()), safeHttps(room.getTourVideoUrl()), available ? "AVAILABLE" : "UNAVAILABLE");
    }
    private static Integer coordinate(Integer value) { return value != null && value >= 0 && value <= 100 ? value : null; }
    private static String safeHttps(String value) {
        if (value == null || value.length() > 1000 || !value.startsWith("https://")) return null;
        try {
            var uri=java.net.URI.create(value);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost()!=null && uri.getRawUserInfo()==null ? value : null;
        }
        catch (IllegalArgumentException e) { return null; }
    }
}
