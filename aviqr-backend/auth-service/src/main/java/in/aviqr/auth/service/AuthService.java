package in.aviqr.auth.service;

import in.aviqr.auth.dto.*;
import in.aviqr.auth.entity.*;
import in.aviqr.auth.repository.*;
import in.aviqr.auth.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
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

    // Dev convenience only — application-production.properties forces this to false,
    // so production always verifies the real OTP that was generated and sent via SMS.
    @Value("${app.otp.dev-mode:false}")
    private boolean otpDevMode;

    @Value("${app.otp.fixed-code:000000}")
    private String otpFixedCode;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
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
        User user = userRepo.findByEmail(req.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash()))
            throw new RuntimeException("Invalid credentials");
        if (user.getStatus() == UserStatus.SUSPENDED)
            throw new RuntimeException("Account suspended. Contact support.");

        user.setLastLoginAt(LocalDateTime.now());
        userRepo.save(user);
        auditService.log("USER_LOGIN", user.getId().toString(), "Login via email: " + user.getEmail());

        return buildAuthResponse(user);
    }

    @Transactional
    public String sendOtp(SendOtpRequest req) {
        // Rate limit: max 3 OTPs per phone per 10 minutes
        long recentCount = otpRepo.countByTargetAndCreatedAtAfter(req.getPhone(), LocalDateTime.now().minusMinutes(10));
        if (recentCount >= 3) throw new RuntimeException("Too many OTP requests. Wait 10 minutes.");

        String otp = String.format("%06d", new Random().nextInt(999999));

        OtpRecord record = OtpRecord.builder()
                .target(req.getPhone())
                .otp(passwordEncoder.encode(otp)) // hash OTP for storage
                .type(OtpType.PHONE_LOGIN)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .createdAt(LocalDateTime.now())
                .used(false)
                .build();
        otpRepo.save(record);

        // In production: send via Twilio / SMS gateway
        log.info("OTP for {}: {} (send via SMS in production)", req.getPhone(), otp);
        return "OTP sent to " + req.getPhone().substring(0, 6) + "****";
    }

    @Transactional
    public AuthResponse loginWithOtp(OtpLoginRequest req) {
        boolean devBypass = otpDevMode && otpFixedCode.equals(req.getOtp());

        if (!devBypass) {
            var candidates = otpRepo.findByTargetAndTypeAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                    req.getPhone(), OtpType.PHONE_LOGIN, LocalDateTime.now());

            var otpRecord = candidates.stream()
                    .filter(r -> passwordEncoder.matches(req.getOtp(), r.getOtp()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Invalid or expired OTP"));

            otpRecord.setUsed(true);
            otpRepo.save(otpRecord);
        }

        // A verified OTP is proof of phone ownership, so a first-time phone (the common
        // case — a customer scanning a QR code has never registered anywhere) self-registers
        // here as a CUSTOMER instead of being rejected. email/passwordHash stay required,
        // not-null columns on User, but a customer never uses either — synthesize a unique
        // placeholder email and a random, never-issued password hash.
        User user = userRepo.findByPhone(req.getPhone()).orElseGet(() -> {
            User created = User.builder()
                    .name("Guest")
                    .email(req.getPhone() + "@customer.aviqr.local")
                    .phone(req.getPhone())
                    .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .role(UserRole.CUSTOMER)
                    .preferredLanguage("en")
                    .status(UserStatus.ACTIVE)
                    .build();
            created = userRepo.save(created);
            auditService.log("USER_REGISTERED", created.getId().toString(), "Customer self-registered via OTP: " + req.getPhone());
            return created;
        });

        user.setLastLoginAt(LocalDateTime.now());
        user.setPhoneVerified(true);
        userRepo.save(user);
        auditService.log("USER_LOGIN_OTP", user.getId().toString(), "Login via OTP: " + req.getPhone());

        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest req) {
        var stored = refreshRepo.findByTokenAndRevokedFalse(req.getRefreshToken())
                .orElseThrow(() -> new RuntimeException("Invalid refresh token"));

        if (stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            stored.setRevoked(true);
            refreshRepo.save(stored);
            throw new RuntimeException("Refresh token expired. Please login again.");
        }

        User user = userRepo.findById(stored.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return buildAuthResponse(user);
    }

    @Transactional
    public void logout(UUID userId) {
        refreshRepo.deleteByUserId(userId);
        auditService.log("USER_LOGOUT", userId.toString(), "User logged out");
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
        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPasswordHash()))
            throw new RuntimeException("Current password incorrect");
        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        userRepo.save(user);
        refreshRepo.deleteByUserId(userId); // invalidate all sessions
    }

    public UserDto getProfile(UUID userId) {
        return toDto(userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found")));
    }

    @Transactional
    public AuthResponse linkShop(UUID userId, String shopId) {
        User user = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        user.setShopId(shopId);
        userRepo.save(user);
        return buildAuthResponse(user);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private AuthResponse buildAuthResponse(User user) {
        String accessToken  = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user.getId());

        // Save refresh token
        refreshRepo.save(RefreshToken.builder()
                .token(refreshToken)
                .userId(user.getId())
                .expiresAt(LocalDateTime.now().plusSeconds(jwtService.getRefreshExpirationMs() / 1000))
                .createdAt(LocalDateTime.now())
                .build());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
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
