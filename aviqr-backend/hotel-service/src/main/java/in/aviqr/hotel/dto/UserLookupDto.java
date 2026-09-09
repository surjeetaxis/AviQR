package in.aviqr.hotel.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

// Mirrors auth-service's UserLookupResponse — the shape returned by
// GET /api/v1/auth/internal/users/lookup.
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class UserLookupDto {
    UUID id;
    String name;
    String email;
}
