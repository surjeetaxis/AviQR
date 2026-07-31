package in.aviqr.auth.dto;

import lombok.Data;

// PATCH /api/v1/auth/admin/users/{id} — lets support/admin fix a customer's
// account data directly (e.g. a typo'd phone/email blocking their login).
// All fields optional; only non-null ones are applied.
@Data
public class AdminUpdateUserRequest {
    String name;
    String email;
    String phone;
    String avatar;
    String preferredLanguage;
}
