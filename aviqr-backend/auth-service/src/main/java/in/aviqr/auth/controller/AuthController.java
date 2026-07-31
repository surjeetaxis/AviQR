package in.aviqr.auth.controller;

import in.aviqr.auth.dto.*;
import in.aviqr.auth.entity.Platform;
import in.aviqr.auth.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // POST /api/v1/auth/register
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Registration successful", authService.register(req)));
    }

    // POST /api/v1/auth/login
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest req,
            @RequestHeader(value = "X-Platform", required = false) String platform,
            @RequestHeader(value = "X-Device-Id", required = false) String deviceId,
            @RequestHeader(value = "X-Device-Model", required = false) String deviceModel,
            @RequestHeader(value = "X-App-Version", required = false) String appVersion,
            HttpServletRequest httpReq) {
        return ResponseEntity.ok(ApiResponse.ok("Login successful",
                authService.login(req, deviceInfo(platform, deviceId, deviceModel, appVersion, httpReq))));
    }

    // POST /api/v1/auth/otp/send
    @PostMapping("/otp/send")
    public ResponseEntity<ApiResponse<String>> sendOtp(@Valid @RequestBody SendOtpRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(authService.sendOtp(req)));
    }

    // POST /api/v1/auth/otp/login
    @PostMapping("/otp/login")
    public ResponseEntity<ApiResponse<AuthResponse>> otpLogin(
            @Valid @RequestBody OtpLoginRequest req,
            @RequestHeader(value = "X-Platform", required = false) String platform,
            @RequestHeader(value = "X-Device-Id", required = false) String deviceId,
            @RequestHeader(value = "X-Device-Model", required = false) String deviceModel,
            @RequestHeader(value = "X-App-Version", required = false) String appVersion,
            HttpServletRequest httpReq) {
        return ResponseEntity.ok(ApiResponse.ok("Login successful",
                authService.loginWithOtp(req, deviceInfo(platform, deviceId, deviceModel, appVersion, httpReq))));
    }

    // POST /api/v1/auth/refresh
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshTokenRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(authService.refreshToken(req)));
    }

    // POST /api/v1/auth/logout — body is optional; pass {"refreshToken": "..."} to
    // end just that session, or omit it to keep the old "log out everywhere" behavior.
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody(required = false) Map<String, String> body) {
        authService.logout(UUID.fromString(userId), body != null ? body.get("refreshToken") : null);
        return ResponseEntity.ok(ApiResponse.ok("Logged out", null));
    }

    private DeviceInfo deviceInfo(String platform, String deviceId, String deviceModel,
                                  String appVersion, HttpServletRequest httpReq) {
        String forwardedFor = httpReq.getHeader("X-Forwarded-For");
        String ip = (forwardedFor != null && !forwardedFor.isBlank())
                ? forwardedFor.split(",")[0].trim()
                : httpReq.getRemoteAddr();
        return DeviceInfo.builder()
                .platform(Platform.from(platform))
                .deviceId(deviceId)
                .deviceModel(deviceModel)
                .appVersion(appVersion)
                .ipAddress(ip)
                .userAgent(httpReq.getHeader("User-Agent"))
                .build();
    }

    // GET /api/v1/auth/profile
    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserDto>> profile(@RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(ApiResponse.ok(authService.getProfile(UUID.fromString(userId))));
    }

    // PUT /api/v1/auth/profile
    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserDto>> updateProfile(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody UpdateProfileRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Profile updated", authService.updateProfile(UUID.fromString(userId), req)));
    }

    // PUT /api/v1/auth/change-password
    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody ChangePasswordRequest req) {
        authService.changePassword(UUID.fromString(userId), req);
        return ResponseEntity.ok(ApiResponse.ok("Password changed", null));
    }

    // PUT /api/v1/auth/deactivate
    @PutMapping("/deactivate")
    public ResponseEntity<ApiResponse<Void>> deactivate(@RequestHeader("X-User-Id") String userId) {
        authService.deactivateAccount(UUID.fromString(userId));
        return ResponseEntity.ok(ApiResponse.ok("Account deactivated", null));
    }

    // PUT /api/v1/auth/link-shop  — called after onboarding shop creation; returns fresh JWT
    @PutMapping("/link-shop")
    public ResponseEntity<ApiResponse<AuthResponse>> linkShop(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok("Shop linked", authService.linkShop(UUID.fromString(userId), body.get("shopId"))));
    }

    // POST /api/v1/auth/forgot-password
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<String>> forgotPassword(@RequestParam String email) {
        // send reset link via email — integration point
        return ResponseEntity.ok(ApiResponse.ok("Reset link sent to " + email, null));
    }

    // PUT /api/v1/auth/language
    @PutMapping("/language")
    public ResponseEntity<ApiResponse<Void>> updateLanguage(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam String lang) {
        authService.updateProfile(UUID.fromString(userId), new UpdateProfileRequest() {{ setPreferredLanguage(lang); }});
        return ResponseEntity.ok(ApiResponse.ok("Language updated", null));
    }
}
