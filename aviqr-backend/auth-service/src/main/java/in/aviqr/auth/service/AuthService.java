package in.aviqr.auth.service;

import in.aviqr.auth.dto.*;
import in.aviqr.auth.entity.*;
import in.aviqr.auth.repository.*;
import in.aviqr.auth.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.security.SecureRandom;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j
public class AuthService {

    private final UserRepository userRepo;
    private final OtpRepository otpRepo;
    private final RefreshTokenRepository refreshRepo;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditService;
    private final RabbitTemplate rabbit;
    private final LoginSecurityService loginSecurity;
    private final OtpVerificationService otpVerification;
    private final ShopOwnershipService shopOwnership;
    private static final SecureRandom RANDOM = new SecureRandom();

    // Dev convenience only — application-production.properties forces this to false,
    // so production always verifies the real OTP that was generated and sent via SMS.
    @Value("${app.otp.dev-mode:false}")
    private boolean otpDevMode;

    @Value("${app.otp.fixed-code:000000}")
    private String otpFixedCode;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (req.getRole() != null && !java.util.Set.of(UserRole.OWNER,UserRole.HOTEL,UserRole.MALL,UserRole.SUPPLIER,UserRole.CUSTOMER).contains(req.getRole()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"This role requires administrator provisioning");
        req.setEmail(req.getEmail().trim().toLowerCase(java.util.Locale.ROOT));
        LoginSecurityService.validatePassword(req.getPassword());
        if (userRepo.existsByEmail(req.getEmail())) throw new RuntimeException("Email already registered");
        if (req.getPhone() != null && userRepo.existsByPhone(req.getPhone())) throw new RuntimeException("Phone already registered");

        User user = User.builder()
                .name(req.getName())
                .email(req.getEmail())
                .phone(req.getPhone())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .role(req.getRole() != null ? req.getRole() : UserRole.OWNER)
                .preferredLanguage(req.getPreferredLanguage() != null ? req.getPreferredLanguage() : "en")
                .status(UserStatus.ACTIVE)
                .build();

        user = userRepo.save(user);
        auditService.log("USER_REGISTERED", user.getId().toString(), "User registered: " + user.getEmail());

        // Publish welcome email event to notification-service
        try {
            rabbit.convertAndSend("aviqr.users", "user.registered",
                Map.of("email", user.getEmail(), "name", user.getName(),
                       "role",  user.getRole().name()));
        } catch (Exception e) { log.warn("Failed to publish user.registered event: {}", e.getMessage()); }

        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        return login(req, DeviceInfo.builder().build());
    }

    @Transactional
    public AuthResponse login(LoginRequest req, DeviceInfo device) {
        String email = req.getEmail().trim().toLowerCase(java.util.Locale.ROOT);
        loginSecurity.checkBlocked(email,device);
        User user = userRepo.findByEmail(email).orElse(null);
        if (user == null || !passwordEncoder.matches(req.getPassword(),user.getPasswordHash())) {
            loginSecurity.event(email,"LOGIN_FAILURE","FAILED","Invalid credentials",device,null);
            loginSecurity.checkBlocked(email,device);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid credentials");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            loginSecurity.event(email,"BLOCKED_LOGIN","BLOCKED","Account status: "+user.getStatus(),device,null);
            LoginSecurityService.requireActive(user);
        }
        if (LoginSecurityService.privileged(user)) {
            sendOtp(newSendOtp(email),device);
            return AuthResponse.builder().requiresOtp(true).challengeId(loginSecurity.challenge(user,device)).build();
        }

        user.setLastLoginAt(LocalDateTime.now());
        userRepo.save(user);
        auditService.log("USER_LOGIN", user.getId().toString(),
                "Login via email: " + user.getEmail() + " [" + device.getPlatform() + "]");

        return buildAuthResponse(user, device);
    }

    // Email-only for now — SMS/WhatsApp providers (Twilio, MSG91 SMS/WhatsApp) aren't
    // production-ready yet (DLT template pending, no WhatsApp Business number connected), so
    // login/register OTP is delivered exclusively via MSG91 email until those are live.
    @Transactional
    public String sendOtp(SendOtpRequest req) {
        return sendOtp(req,DeviceInfo.builder().build());
    }

    @Transactional
    public String sendOtp(SendOtpRequest req,DeviceInfo device) {
        String email = req.getEmail().trim().toLowerCase(java.util.Locale.ROOT);
        loginSecurity.checkBlocked(email,device);
        loginSecurity.reserveOtpSend(email,device,false);

        String otp = String.format("%06d", RANDOM.nextInt(1_000_000));

        OtpRecord record = OtpRecord.builder()
                .target(email)
                .otp(passwordEncoder.encode(otp)) // hash OTP for storage
                .type(OtpType.EMAIL_LOGIN)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .createdAt(LocalDateTime.now())
                .used(false)
                .build();
        otpRepo.save(record);

        try {
            var payload = new java.util.HashMap<String, Object>();
            payload.put("email", email);
            payload.put("otp", otp);
            userRepo.findByEmail(email).ifPresent(u -> {
                if (u.getName() != null && !u.getName().isBlank()) payload.put("name", u.getName());
            });
            rabbit.convertAndSend("aviqr.users", "otp.requested", payload);
        } catch (Exception e) { log.warn("Failed to publish otp.requested event: {}", e.getMessage()); }
        log.info("OTP requested");
        return "OTP sent to " + maskEmail(email);
    }

    // Same delivery path as sendOtp (a 6-digit code via MSG91 email, reusing the "global_otp"
    // template — a dedicated "password reset" template doesn't exist and isn't needed, the
    // wording is generic enough) but never reveals whether the email is registered: a
    // non-existent account gets the identical response and no OTP record, no event, no error.
    @Transactional
    public String forgotPassword(String email) {
        return forgotPassword(email,DeviceInfo.builder().build());
    }
    @Transactional
    public String forgotPassword(String email,DeviceInfo device) {
        String normalized = email.trim().toLowerCase();
        loginSecurity.reserveOtpSend(normalized,device,true);
        loginSecurity.event(normalized,"PASSWORD_RESET","REQUESTED","Self-service reset requested",device,null);
        userRepo.findByEmail(normalized).filter(user -> user.getStatus()==UserStatus.ACTIVE).ifPresent(user -> {
            String otp = String.format("%06d", RANDOM.nextInt(1_000_000));
            OtpRecord record = OtpRecord.builder()
                    .target(normalized)
                    .otp(passwordEncoder.encode(otp))
                    .type(OtpType.PASSWORD_RESET)
                    .expiresAt(LocalDateTime.now().plusMinutes(10))
                    .createdAt(LocalDateTime.now())
                    .used(false)
                    .build();
            otpRepo.save(record);

            try {
                var payload = new java.util.HashMap<String, Object>();
                payload.put("email", normalized);
                payload.put("otp", otp);
                if (user.getName() != null && !user.getName().isBlank()) payload.put("name", user.getName());
                rabbit.convertAndSend("aviqr.users", "otp.requested", payload);
            } catch (Exception e) { log.warn("Failed to publish otp.requested event for password reset: {}", e.getMessage()); }
            log.info("Password reset requested");
        });
        return "If an account exists for " + email + ", we've sent a password reset code to it.";
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        resetPassword(req,DeviceInfo.builder().build());
    }
    @Transactional
    public void resetPassword(ResetPasswordRequest req,DeviceInfo device) {
        String email = req.getEmail().trim().toLowerCase();
        LoginSecurityService.validatePassword(req.getNewPassword());

        if (!otpVerification.verify(email,OtpType.PASSWORD_RESET,req.getOtp())) {
            loginSecurity.event(email,"LOGIN_FAILURE","FAILED","Invalid password reset code",device,null);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid or expired code");
        }
        User user = userRepo.findByEmail(email).orElseThrow(() -> new RuntimeException("Invalid or expired code"));
        LoginSecurityService.requireActive(user);
        loginSecurity.revokeGrants(user.getId());
        loginSecurity.event(email,"PASSWORD_RESET","COMPLETED","Password reset by verified email",DeviceInfo.builder().build(),null);

        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        userRepo.save(user);
        refreshRepo.deleteByUserId(user.getId()); // invalidate all sessions, same as changePassword
        // Unlock commits with the successful password change, never on code request.
        loginSecurity.unlockAfterReset(email,device);
        auditService.log("PASSWORD_RESET", user.getId().toString(), "Password reset via forgot-password flow");
    }

    @Transactional
    public AuthResponse loginWithOtp(OtpLoginRequest req) {
        return loginWithOtp(req, DeviceInfo.builder().build());
    }

    @Transactional
    public AuthResponse loginWithOtp(OtpLoginRequest req, DeviceInfo device) {
        String email = req.getEmail().trim().toLowerCase();
        loginSecurity.checkBlocked(email,device);
        User existing = userRepo.findByEmail(email).orElse(null);
        if (existing != null) {
            if (existing.getStatus() != UserStatus.ACTIVE) {
                loginSecurity.event(email,"BLOCKED_LOGIN","BLOCKED","Account status: "+existing.getStatus(),device,null);
                LoginSecurityService.requireActive(existing);
            }
            if (LoginSecurityService.privileged(existing) && (req.getChallengeId() == null || req.getChallengeId().isBlank()))
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Privileged accounts require password and OTP");
        }
        boolean devBypass = otpDevMode && otpFixedCode.equals(req.getOtp()) && (existing == null || !LoginSecurityService.privileged(existing));
        if (!devBypass && !otpVerification.verify(email,OtpType.EMAIL_LOGIN,req.getOtp())) {
            loginSecurity.event(email,"LOGIN_FAILURE","FAILED","Invalid OTP",device,null);
            loginSecurity.checkBlocked(email,device);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid or expired OTP");
        }
        if (req.getChallengeId() != null) loginSecurity.consumeChallenge(req.getChallengeId(),email);

        // A verified OTP is proof of email ownership, so a first-time email (the common
        // case — a customer scanning a QR code has never registered anywhere) self-registers
        // here as a CUSTOMER instead of being rejected. passwordHash stays a required,
        // not-null column on User, but a customer never uses it — synthesize a random,
        // never-issued password hash. phone is left blank (nullable column).
        User user = userRepo.findByEmail(email).orElseGet(() -> {
            User created = User.builder()
                    .name("Guest")
                    .email(email)
                    .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .role(UserRole.CUSTOMER)
                    .preferredLanguage("en")
                    .status(UserStatus.ACTIVE)
                    .build();
            created = userRepo.save(created);
            auditService.log("USER_REGISTERED", created.getId().toString(), "Customer self-registered via OTP: " + email);
            return created;
        });

        user.setLastLoginAt(LocalDateTime.now());
        user.setEmailVerified(true);
        userRepo.save(user);
        auditService.log("USER_LOGIN_OTP", user.getId().toString(),
                "Login via OTP: " + email + " [" + device.getPlatform() + "]");

        AuthResponse response = buildAuthResponse(user,device);
        if (req.isTrustDevice() && !LoginSecurityService.privileged(user)) response.setTrustedDeviceToken(loginSecurity.trustDevice(user,device));
        return response;
    }

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest req) {
        var stored = refreshRepo.findByTokenAndRevokedFalse(LoginSecurityService.hash(req.getRefreshToken()))
                .orElseThrow(() -> new RuntimeException("Invalid refresh token"));

        if (stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            stored.setRevoked(true);
            refreshRepo.save(stored);
            throw new RuntimeException("Refresh token expired. Please login again.");
        }

        User user = userRepo.findById(stored.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        LoginSecurityService.requireActive(user);
        // Rotate the credential atomically while preserving the session ID used by access/scoped tokens.
        String refreshToken = jwtService.generateRefreshToken(user.getId());
        stored.setToken(LoginSecurityService.hash(refreshToken));
        stored.setLastActiveAt(LocalDateTime.now());
        refreshRepo.save(stored);
        return responseForSession(user,stored,refreshToken);
    }

    // Backward-compatible "kill everything" logout — still used by
    // changePassword()/deactivateAccount(), and by clients that don't send a
    // specific refreshToken to end just their own session.
    @Transactional
    public void logout(UUID userId) {
        refreshRepo.deleteByUserId(userId);
        auditService.log("USER_LOGOUT", userId.toString(), "User logged out (all sessions)");
    }

    @Transactional
    public void logout(UUID userId, String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            logout(userId);
            return;
        }
        refreshRepo.findByTokenAndRevokedFalse(LoginSecurityService.hash(refreshToken))
                .filter(rt -> rt.getUserId().equals(userId))
                .ifPresentOrElse(rt -> {
                    rt.setRevoked(true);
                    rt.setRevokedAt(LocalDateTime.now());
                    rt.setRevokedBy("SELF");
                    refreshRepo.save(rt);
                    auditService.log("USER_LOGOUT", userId.toString(), "User logged out (single session)");
                }, () -> auditService.log("USER_LOGOUT", userId.toString(), "Logout called with unknown/already-revoked session"));
    }

    // ── Session management (used by AdminUserController for support/admin visibility) ──
    public Page<SessionDto> listSessions(UUID userId, Pageable pageable) {
        return refreshRepo.findByUserIdOrderByCreatedAtDesc(userId, pageable).map(this::toSessionDto);
    }

    @Transactional
    public void revokeSession(UUID userId, UUID sessionId, String revokedBy) {
        RefreshToken session = refreshRepo.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        session.setRevoked(true);
        session.setRevokedAt(LocalDateTime.now());
        session.setRevokedBy(revokedBy);
        refreshRepo.save(session);
        auditService.log("SESSION_REVOKED", revokedBy, "Revoked session " + sessionId + " for user " + userId);
    }

    @Transactional
    public void revokeAllSessions(UUID userId, String revokedBy) {
        refreshRepo.revokeAllByUserId(userId, revokedBy, LocalDateTime.now());
        auditService.log("ALL_SESSIONS_REVOKED", revokedBy, "Revoked all sessions for user " + userId);
    }

    private SessionDto toSessionDto(RefreshToken rt) {
        return SessionDto.builder()
                .id(rt.getId())
                .platform(rt.getPlatform())
                .deviceId(rt.getDeviceId())
                .deviceModel(rt.getDeviceModel())
                .appVersion(rt.getAppVersion())
                .ipAddress(rt.getIpAddress())
                .userAgent(rt.getUserAgent())
                .createdAt(rt.getCreatedAt())
                .lastActiveAt(rt.getLastActiveAt())
                .expiresAt(rt.getExpiresAt())
                .revoked(rt.getRevoked())
                .revokedAt(rt.getRevokedAt())
                .revokedBy(rt.getRevokedBy())
                .build();
    }

    // ── Admin/support account management ────────────────────────────────────
    @Transactional
    public UserDto adminUpdateUser(UUID userId, AdminUpdateUserRequest req, String callerId) {
        User user = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        if (req.getName()  != null) user.setName(req.getName());
        if (req.getEmail() != null) user.setEmail(req.getEmail());
        if (req.getPhone() != null) user.setPhone(req.getPhone());
        if (req.getAvatar() != null) user.setAvatar(req.getAvatar());
        if (req.getPreferredLanguage() != null) user.setPreferredLanguage(req.getPreferredLanguage());
        userRepo.save(user);
        auditService.log("USER_UPDATED_BY_STAFF", callerId, "Updated user " + userId + " via support/admin");
        return toDto(user);
    }

    // Mints a short-lived (30 min) access token for targetUserId, carrying an
    // "impersonatedBy" claim, plus a session row so it shows up in that user's
    // sessions and can be revoked/ended like any other session. Called only via
    // the internal-trust endpoint in AuthInternalController (support-service → here).
    @Transactional
    public ImpersonationTokenResponse mintImpersonationToken(UUID targetUserId, String agentId) {
        User target = userRepo.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("Target user not found"));

        LoginSecurityService.requireActive(target);
        User agent = userRepo.findById(UUID.fromString(agentId)).orElseThrow(() -> new RuntimeException("Agent not found"));
        LoginSecurityService.requireActive(agent);
        if (!LoginSecurityService.privileged(agent) || LoginSecurityService.privileged(target))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Invalid impersonation target or agent");
        long impersonationExpiryMs = 15 * 60 * 1000L;
        LocalDateTime now = LocalDateTime.now();

        RefreshToken session = refreshRepo.save(RefreshToken.builder()
                .token("impersonation:" + UUID.randomUUID())
                .userId(target.getId())
                .platform(Platform.UNKNOWN)
                .createdAt(now)
                .lastActiveAt(now)
                .expiresAt(now.plusSeconds(impersonationExpiryMs / 1000))
                .build());

        String token = jwtService.generateAccessToken(target,Map.of("impersonatedBy",agentId,"sid",session.getId().toString(),"tokenType","access"),impersonationExpiryMs);
        auditService.log("IMPERSONATION_TOKEN_ISSUED", agentId, "Issued impersonation token for user " + targetUserId);

        return ImpersonationTokenResponse.builder()
                .accessToken(token)
                .expiresIn(impersonationExpiryMs / 1000)
                .sessionId(session.getId())
                .targetUserId(target.getId())
                .targetUserName(target.getName())
                .targetUserRole(target.getRole())
                .build();
    }

    @Transactional
    public UserDto updateProfile(UUID userId, UpdateProfileRequest req) {
        User user = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        if (req.getName()    != null) user.setName(req.getName());
        if (req.getPhone()   != null) user.setPhone(req.getPhone());
        if (req.getPreferredLanguage() != null) user.setPreferredLanguage(req.getPreferredLanguage());
        if (req.getFcmToken() != null) user.setFcmToken(req.getFcmToken());
        if (req.getAvatar()  != null) user.setAvatar(req.getAvatar());
        userRepo.save(user);
        return toDto(user);
    }

    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest req) {
        User user = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        LoginSecurityService.validatePassword(req.getNewPassword());
        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPasswordHash()))
            throw new RuntimeException("Current password incorrect");
        loginSecurity.revokeGrants(userId);
        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        userRepo.save(user);
        refreshRepo.deleteByUserId(userId); // invalidate all sessions
    }

    @Transactional
    public void deactivateAccount(UUID userId) {
        User user = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        loginSecurity.revokeGrants(userId);
        user.setStatus(UserStatus.INACTIVE);
        userRepo.save(user);
        refreshRepo.deleteByUserId(userId); // invalidate all sessions
    }

    public UserDto getProfile(UUID userId) {
        return toDto(userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found")));
    }

    @Transactional
    public AuthResponse linkShop(UUID userId, String shopId) {
        User user = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        LoginSecurityService.requireActive(user);
        if (!java.util.Set.of(UserRole.OWNER,UserRole.SUPPLIER,UserRole.HOTEL,UserRole.MALL,UserRole.ADMIN).contains(user.getRole()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"This role cannot link shops");
        shopOwnership.requireOwner(userId,shopId);
        user.setShopId(shopId);
        userRepo.save(user);
        return buildAuthResponse(user);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private SendOtpRequest newSendOtp(String email) { var request = new SendOtpRequest(); request.setEmail(email); return request; }

    private String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 1) return email;
        int visible = Math.min(2, at);
        return email.substring(0, visible) + "****" + email.substring(at);
    }

    private AuthResponse buildAuthResponse(User user) {
        return buildAuthResponse(user, DeviceInfo.builder().build());
    }

    private AuthResponse buildAuthResponse(User user, DeviceInfo device) {
        String refreshToken = jwtService.generateRefreshToken(user.getId());
        LocalDateTime now = LocalDateTime.now();

        RefreshToken session = refreshRepo.save(RefreshToken.builder()
                .token(LoginSecurityService.hash(refreshToken))
                .userId(user.getId())
                .expiresAt(now.plusSeconds(jwtService.getRefreshExpirationMs() / 1000))
                .createdAt(now)
                .lastActiveAt(now)
                .platform(device.getPlatform() != null ? device.getPlatform() : Platform.UNKNOWN)
                .deviceId(device.getDeviceId())
                .deviceModel(device.getDeviceModel())
                .appVersion(device.getAppVersion())
                .ipAddress(device.getIpAddress())
                .userAgent(device.getUserAgent())
                .build());

        return responseForSession(user,session,refreshToken);
    }

    private AuthResponse responseForSession(User user,RefreshToken session,String rawRefreshToken) {
        String accessToken = jwtService.generateAccessToken(user,Map.of("sid",session.getId().toString(),"tokenType","access"),jwtService.getExpirationMs());
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(rawRefreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtService.getExpirationMs() / 1000)
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole())
                .shopId(user.getShopId())
                .avatar(user.getAvatar())
                .preferredLanguage(user.getPreferredLanguage())
                .isOnboardingComplete(user.getShopId() != null)
                .sessionId(session.getId())
                .platform(session.getPlatform())
                .accountStatus(user.getStatus())
                .emailVerified(user.getEmailVerified())
                .phoneVerified(user.getPhoneVerified())
                .build();
    }

    private UserDto toDto(User u) {
        UserDto dto = new UserDto();
        dto.setId(u.getId()); dto.setName(u.getName()); dto.setEmail(u.getEmail());
        dto.setPhone(u.getPhone()); dto.setRole(u.getRole()); dto.setStatus(u.getStatus());
        dto.setAvatar(u.getAvatar()); dto.setShopId(u.getShopId());
        dto.setEmailVerified(u.getEmailVerified()); dto.setPhoneVerified(u.getPhoneVerified());
        dto.setPreferredLanguage(u.getPreferredLanguage()); dto.setCreatedAt(u.getCreatedAt());
        dto.setLastLoginAt(u.getLastLoginAt());
        return dto;
    }
}
