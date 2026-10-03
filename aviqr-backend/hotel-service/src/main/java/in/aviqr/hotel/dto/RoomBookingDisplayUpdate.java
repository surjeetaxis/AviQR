package in.aviqr.hotel.dto;

public record RoomBookingDisplayUpdate(String floor, String roomSide, String viewType,
    Integer mapX, Integer mapY, String panoramaUrl, String model3dUrl, String tourVideoUrl) { }
