package in.aviqr.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

// Returned by the internal users/lookup endpoint used by hotel-service's
// HotelAccessController to show real names instead of raw user ids in the
// Hotel Staff access list.
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class UserLookupResponse {
    UUID id;
    String name;
    String email;
}
