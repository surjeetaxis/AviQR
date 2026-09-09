package in.aviqr.hotel.dto;

import in.aviqr.hotel.entity.HotelRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

// HotelAccess enriched with the granted user's real name/email (resolved from
// auth-service) and the scoped outlet's name (if any), instead of showing the
// hotel owner raw userId/outletId UUIDs in the Hotel Staff list.
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class HotelAccessResponse {
    UUID id;
    String userId;
    String userName;
    String userEmail;
    HotelRole role;
    UUID outletId;
    String outletName;
    LocalDateTime createdAt;
}
