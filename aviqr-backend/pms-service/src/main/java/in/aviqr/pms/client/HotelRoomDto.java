package in.aviqr.pms.client;

import lombok.Data;
import java.util.UUID;

/** Mirrors the subset of hotel-service's Room fields pms-service needs. */
@Data
public class HotelRoomDto {
    private UUID id;
    private UUID hotelId;
    private String roomNumber;
    private String roomType;
    private String floor;
    private String roomSide;
    private String viewType;
    private Integer mapX;
    private Integer mapY;
    private String panoramaUrl;
    private String model3dUrl;
    private String tourVideoUrl;
    private String status;
    private String housekeepingStatus;
}
