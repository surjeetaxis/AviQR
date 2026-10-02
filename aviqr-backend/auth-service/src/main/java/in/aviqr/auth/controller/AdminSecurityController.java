package in.aviqr.auth.controller;

import in.aviqr.auth.dto.*;
import in.aviqr.auth.entity.*;
import in.aviqr.auth.repository.*;
import in.aviqr.auth.service.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@RestController @RequestMapping("/api/v1/auth/admin/security") @RequiredArgsConstructor
public class AdminSecurityController {
    private final LoginSecurityRepository records;
    private final UserRepository users;
    private final RefreshTokenRepository sessions;
    private final LoginSecurityService security;
    private final AuthService auth;
    private final PasswordEncoder encoder;
    private final AuditLogService audit;
    private void action(User user,String action,String reason,String actor) {
        records.save(LoginSecurityRecord.builder().userId(user.getId()).email(user.getEmail()).kind("ADMIN_ACTION")
            .status(action).reason(reason).actorId(actor).createdAt(LocalDateTime.now()).build());
    }
    private void admin(String role) {
        if (!"ADMIN".equals(role)) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Administrator access required");
    }
    public record ExemptionRequest(@NotNull UUID userId, @NotBlank @Size(max=500) String reason, @Min(1) @Max(30) int days) {}
    public record SupportRequest(@NotBlank @Size(max=150) String name, @Email @NotBlank String email) {}
    public record ActionRequest(@NotBlank @Size(max=500) String reason) {}
    public record EmailRequest(@Email @NotBlank String email, @NotBlank @Size(max=500) String reason) {}

    @GetMapping("/records")
    public ApiResponse<Page<LoginSecurityRecord>> records(@RequestParam(defaultValue="LOGIN_SUCCESS") String kind,
        @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="20") int size,
        @RequestHeader("X-User-Role") String role) {
        boolean support="SUPPORT".equals(role);
        if(support && !Set.of("ACCOUNT_LOCK","BLOCKED_LOGIN").contains(kind))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Administrator access required");
        if(!support) admin(role);
        var pageable=PageRequest.of(Math.max(0,page),Math.min(100,Math.max(1,size)));
        var result=support ? records.findSupportRecords(kind,List.of(UserRole.ADMIN,UserRole.SUPPORT),pageable) : records.findByKindOrderByCreatedAtDesc(kind,pageable);
        return ApiResponse.ok(result.map(r -> LoginSecurityRecord.builder().id(r.getId()).userId(r.getUserId()).email(r.getEmail())
            .kind(r.getKind()).status("ACCOUNT_LOCK".equals(r.getKind()) ?
                (security.activeLock(r.getEmail()).filter(lock -> lock.getId().equals(r.getId())).isPresent()?"BLOCKED":r.getExpiresAt().isAfter(LocalDateTime.now())?"RELEASED":"EXPIRED") : "ACTIVE".equals(r.getStatus()) && r.getExpiresAt()!=null && r.getExpiresAt().isBefore(LocalDateTime.now()) ? "EXPIRED" : r.getStatus())
            .reason(r.getReason()).actorId(r.getActorId()).ipAddress(r.getIpAddress()).userAgent(r.getUserAgent()).deviceId(r.getDeviceId())
            .createdAt(r.getCreatedAt()).expiresAt(r.getExpiresAt()).build()));
    }
    @PostMapping("/otp-exemptions") @Transactional
    public ApiResponse<LoginSecurityRecord> exemption(@Valid @RequestBody ExemptionRequest req,
        @RequestHeader("X-User-Role") String role, @RequestHeader("X-User-Id") String actor) {
        admin(role);
        User target = users.findById(req.userId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"User not found"));
        LoginSecurityService.requireActive(target);
        if (LoginSecurityService.privileged(target)) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"ADMIN and SUPPORT always require password and OTP");
        for (var grant : records.findByUserIdAndKindAndStatus(target.getId(),"OTP_EXEMPTION","ACTIVE")) { grant.setStatus("REVOKED"); records.save(grant); }
        var saved = records.save(LoginSecurityRecord.builder().userId(target.getId()).email(target.getEmail()).kind("OTP_EXEMPTION")
            .status("ACTIVE").actorId(actor).reason(req.reason()).createdAt(LocalDateTime.now()).expiresAt(LocalDateTime.now().plusDays(req.days())).build());
        audit.log("OTP_EXEMPTION_GRANTED",actor,"User "+target.getId()+": "+req.reason());
        return ApiResponse.ok(saved);
    }
    @PostMapping("/records/{id}/revoke") @Transactional
    public ApiResponse<Void> revoke(@PathVariable UUID id, @Valid @RequestBody ActionRequest req,
        @RequestHeader("X-User-Role") String role, @RequestHeader("X-User-Id") String actor) {
        admin(role);
        var grant = records.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Grant not found"));
        if (!Set.of("OTP_EXEMPTION","TRUSTED_DEVICE").contains(grant.getKind())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Only grants can be revoked");
        grant.setStatus("REVOKED"); records.save(grant);
        if (grant.getUserId()!=null) sessions.revokeAllByUserId(grant.getUserId(),actor,LocalDateTime.now());
        if (grant.getUserId()!=null) users.findById(grant.getUserId()).ifPresent(user -> action(user,"GRANT_REVOKED",req.reason(),actor));
        audit.log("SECURITY_GRANT_REVOKED",actor,id+": "+req.reason());
        return ApiResponse.ok("Grant and existing sessions revoked",null);
    }
    @PostMapping("/password-resets") @Transactional
    public ApiResponse<Void> reset(@Valid @RequestBody EmailRequest req,
        @RequestHeader("X-User-Role") String role, @RequestHeader("X-User-Id") String actor) {
        admin(role);
        var target = users.findByEmail(req.email().trim().toLowerCase(Locale.ROOT))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"User not found"));
        LoginSecurityService.requireActive(target);
        sessions.revokeAllByUserId(target.getId(),actor,LocalDateTime.now()); security.revokeGrants(target.getId());
        auth.forgotPassword(target.getEmail());
        security.event(target.getEmail(),"PASSWORD_RESET","REQUESTED",req.reason(),DeviceInfo.builder().build(),actor);
        audit.log("ADMIN_PASSWORD_RESET_REQUESTED",actor,target.getId()+": "+req.reason());
        return ApiResponse.ok("Sessions revoked; reset requested for the user's verified email flow",null);
    }
    @PostMapping("/unblock")
    public ApiResponse<Void> unblock(@Valid @RequestBody EmailRequest req,
        @RequestHeader("X-User-Role") String role, @RequestHeader("X-User-Id") String actor) {
        if(!"SUPPORT".equals(role)) admin(role);
        var target=users.findByEmail(req.email().trim().toLowerCase(Locale.ROOT))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"User not found"));
        if("SUPPORT".equals(role) && LoginSecurityService.privileged(target))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Support cannot unlock privileged accounts");
        security.event(req.email(),"LOGIN_UNBLOCK","COMPLETED",req.reason(),DeviceInfo.builder().build(),actor);
        audit.log("LOGIN_UNBLOCKED",actor,req.email()+": "+req.reason());
        return ApiResponse.ok("Account attempt lock cleared; IP limits and account status still apply",null);
    }
    @GetMapping("/support")
    public ApiResponse<Page<UserDto>> support(@RequestParam(defaultValue="0") int page,
        @RequestHeader("X-User-Role") String role) {
        admin(role);
        return ApiResponse.ok(users.findByRole(UserRole.SUPPORT,PageRequest.of(Math.max(0,page),20,Sort.by("createdAt").descending())).map(this::safeUser));
    }
    @PostMapping("/support") @Transactional
    public ApiResponse<UserDto> createSupport(@Valid @RequestBody SupportRequest req,
        @RequestHeader("X-User-Role") String role, @RequestHeader("X-User-Id") String actor) {
        admin(role);
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmail(email)) throw new ResponseStatusException(HttpStatus.CONFLICT,"Email already registered");
        var saved = users.save(User.builder().name(req.name()).email(email).role(UserRole.SUPPORT).status(UserStatus.PENDING)
            .passwordHash(encoder.encode(LoginSecurityService.randomToken())).preferredLanguage("en").build());
        action(saved,"SUPPORT_CREATED","Pending support account registered",actor);
        audit.log("SUPPORT_CREATED",actor,"Pending support account "+saved.getId());
        return ApiResponse.ok(safeUser(saved));
    }
    @PostMapping("/support/{id}/approve") @Transactional
    public ApiResponse<UserDto> approve(@PathVariable UUID id,@Valid @RequestBody ActionRequest req,
        @RequestHeader("X-User-Role") String role, @RequestHeader("X-User-Id") String actor) {
        admin(role); var target = supportUser(id);
        if (target.getStatus()!=UserStatus.PENDING) throw new ResponseStatusException(HttpStatus.CONFLICT,"Only pending support accounts can be approved");
        target.setStatus(UserStatus.ACTIVE); users.save(target);
        auth.forgotPassword(target.getEmail());
        action(target,"SUPPORT_APPROVED",req.reason(),actor);
        audit.log("SUPPORT_APPROVED",actor,id+": "+req.reason());
        return ApiResponse.ok(safeUser(target));
    }
    @PostMapping("/support/{id}/terminate") @Transactional
    public ApiResponse<UserDto> terminate(@PathVariable UUID id,@Valid @RequestBody ActionRequest req,
        @RequestHeader("X-User-Role") String role, @RequestHeader("X-User-Id") String actor) {
        admin(role); var target = supportUser(id);
        target.setStatus(UserStatus.TERMINATED); users.save(target);
        sessions.revokeAllByUserId(id,actor,LocalDateTime.now()); security.revokeGrants(id);
        action(target,"SUPPORT_TERMINATED",req.reason(),actor);
        audit.log("SUPPORT_TERMINATED",actor,id+": "+req.reason());
        return ApiResponse.ok(safeUser(target));
    }
    private User supportUser(UUID id) {
        return users.findById(id).filter(u -> u.getRole()==UserRole.SUPPORT)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Support account not found"));
    }
    private UserDto safeUser(User u) {
        var dto = new UserDto(); dto.setId(u.getId()); dto.setName(u.getName()); dto.setEmail(u.getEmail());
        dto.setRole(u.getRole()); dto.setStatus(u.getStatus()); dto.setCreatedAt(u.getCreatedAt()); dto.setLastLoginAt(u.getLastLoginAt());
        return dto;
    }
}
