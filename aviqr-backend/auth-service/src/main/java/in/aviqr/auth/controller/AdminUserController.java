package in.aviqr.auth.controller;

import in.aviqr.auth.dto.*;
import in.aviqr.auth.entity.*;
import in.aviqr.auth.repository.UserRepository;
import in.aviqr.auth.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserRepository userRepo;
    private final AuditLogService auditService;

    // GET /api/v1/auth/admin/users
    @GetMapping
    public ResponseEntity<ApiResponse<Page<UserDto>>> listUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader("X-User-Role") String callerRole) {

        if (!"ADMIN".equals(callerRole) && !"SUPPORT".equals(callerRole))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<User> users;

        if (search != null && !search.isBlank()) {
            users = userRepo.search(search, pageable);
        } else if (role != null) {
            UserRole r = UserRole.valueOf(role.toUpperCase());
            users = status != null
                    ? userRepo.findByRoleAndStatus(r, UserStatus.valueOf(status.toUpperCase()), pageable)
                    : userRepo.findByRoleAndStatus(r, UserStatus.ACTIVE, pageable);
        } else {
            users = userRepo.findAll(pageable);
        }

        return ResponseEntity.ok(ApiResponse.ok(users.map(this::toDto)));
    }

    // GET /api/v1/auth/admin/users/{id}
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> getUser(@PathVariable UUID id) {
        return userRepo.findById(id)
                .map(u -> ResponseEntity.ok(ApiResponse.ok(toDto(u))))
                .orElse(ResponseEntity.notFound().build());
    }

    // PUT /api/v1/auth/admin/users/{id}/status
    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> changeStatus(
            @PathVariable UUID id,
            @RequestParam String status,
            @RequestHeader("X-User-Id") String adminId) {
        userRepo.findById(id).ifPresent(u -> {
            u.setStatus(UserStatus.valueOf(status.toUpperCase()));
            userRepo.save(u);
            auditService.log("USER_STATUS_CHANGED", adminId, "Changed user " + id + " status to " + status);
        });
        return ResponseEntity.ok(ApiResponse.ok("Status updated", null));
    }

    // PUT /api/v1/auth/admin/users/{id}/role
    @PutMapping("/{id}/role")
    public ResponseEntity<ApiResponse<Void>> changeRole(
            @PathVariable UUID id,
            @RequestParam String role,
            @RequestHeader("X-User-Id") String adminId) {
        userRepo.findById(id).ifPresent(u -> {
            u.setRole(UserRole.valueOf(role.toUpperCase()));
            userRepo.save(u);
            auditService.log("USER_ROLE_CHANGED", adminId, "Changed user " + id + " role to " + role);
        });
        return ResponseEntity.ok(ApiResponse.ok("Role updated", null));
    }

    // DELETE /api/v1/auth/admin/users/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String adminId) {
        userRepo.deleteById(id);
        auditService.log("USER_DELETED", adminId, "Deleted user: " + id);
        return ResponseEntity.ok(ApiResponse.ok("User deleted", null));
    }

    // GET /api/v1/auth/admin/users/stats
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<?>> stats() {
        var data = new java.util.HashMap<String, Long>();
        data.put("total", userRepo.count());
        for (UserRole r : UserRole.values()) data.put(r.name().toLowerCase(), userRepo.countByRole(r));
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    private UserDto toDto(User u) {
        UserDto dto = new UserDto();
        dto.setId(u.getId()); dto.setName(u.getName()); dto.setEmail(u.getEmail());
        dto.setPhone(u.getPhone()); dto.setRole(u.getRole()); dto.setStatus(u.getStatus());
        dto.setEmailVerified(u.getEmailVerified()); dto.setPhoneVerified(u.getPhoneVerified());
        dto.setCreatedAt(u.getCreatedAt()); dto.setLastLoginAt(u.getLastLoginAt());
        return dto;
    }
}
