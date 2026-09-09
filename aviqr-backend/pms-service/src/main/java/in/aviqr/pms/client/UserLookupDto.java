package in.aviqr.pms.client;

import lombok.*;
import java.util.UUID;

/** Mirrors auth-service's UserLookupResponse — the shape returned by its internal
 *  GET /users/lookup endpoint. */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserLookupDto {
    private UUID id;
    private String name;
    private String email;
}
