package in.aviqr.auth;

import in.aviqr.auth.dto.*;
import in.aviqr.auth.entity.*;
import in.aviqr.auth.repository.*;
import in.aviqr.auth.security.JwtService;
import in.aviqr.auth.service.AuditLogService;
import in.aviqr.auth.service.AuthService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository      userRepo;
    @Mock OtpRepository       otpRepo;
    @Mock RefreshTokenRepository refreshRepo;
    @Mock JwtService          jwtService;
    @Mock PasswordEncoder     encoder;
    @Mock AuditLogService     auditService;
    @Mock RabbitTemplate      rabbit;
    @InjectMocks AuthService  service;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private User activeUser(String email, String phone) {
        return User.builder()
                .id(UUID.randomUUID()).name("Test User")
                .email(email).phone(phone)
                .passwordHash("$hashed$")
                .role(UserRole.OWNER).status(UserStatus.ACTIVE)
                .build();
    }

    private RegisterRequest registerReq(String email, String phone) {
        var r = new RegisterRequest();
        r.setName("New User"); r.setEmail(email);
        r.setPhone(phone); r.setPassword("Test@1234");
        return r;
    }

    private LoginRequest loginReq(String email, String pw) {
        var l = new LoginRequest();
        l.setEmail(email); l.setPassword(pw);
        return l;
    }

    private RefreshToken validToken(UUID userId) {
        return RefreshToken.builder()
                .id(UUID.randomUUID()).token("ref-tok")
                .userId(userId).revoked(false)
                .expiresAt(java.time.LocalDateTime.now().plusDays(7))
                .build();
    }

    // ── register() ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("register: new user is saved and tokens are returned")
    void register_newUser_savedAndTokensReturned() {
        var req = registerReq("new@test.com", "9900112233");
        when(userRepo.existsByEmail("new@test.com")).thenReturn(false);
        when(encoder.encode(anyString())).thenReturn("$hashed$");
        var saved = activeUser("new@test.com", "9900112233");
        when(userRepo.save(any())).thenReturn(saved);
        when(jwtService.generateAccessToken(any())).thenReturn("access-tok");
        when(jwtService.generateRefreshToken(any())).thenReturn("ref-tok");
        when(refreshRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AuthResponse resp = service.register(req);

        assertThat(resp.getAccessToken()).isEqualTo("access-tok");
        assertThat(resp.getRefreshToken()).isEqualTo("ref-tok");
        verify(userRepo).save(any(User.class));
    }

    @Test
    @DisplayName("register: duplicate email throws RuntimeException")
    void register_duplicateEmail_throws() {
        when(userRepo.existsByEmail("dup@test.com")).thenReturn(true);
        assertThatThrownBy(() -> service.register(registerReq("dup@test.com", "9900112234")))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Email already registered");
    }

    @Test
    @DisplayName("register: duplicate phone throws RuntimeException")
    void register_duplicatePhone_throws() {
        when(userRepo.existsByEmail(anyString())).thenReturn(false);
        when(userRepo.existsByPhone("9900112233")).thenReturn(true);
        assertThatThrownBy(() -> service.register(registerReq("new2@test.com", "9900112233")))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Phone already registered");
    }

    @Test
    @DisplayName("register: no role in request defaults to OWNER")
    void register_noRole_defaultsToOwner() {
        var req = registerReq("owner@test.com", "9900112244");
        // role is null on req
        when(userRepo.existsByEmail(anyString())).thenReturn(false);
        when(encoder.encode(anyString())).thenReturn("$hashed$");
        when(jwtService.generateAccessToken(any())).thenReturn("tok");
        when(jwtService.generateRefreshToken(any())).thenReturn("ref");
        when(refreshRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        final User[] capturedUser = new User[1];
        when(userRepo.save(any(User.class))).thenAnswer(inv -> {
            capturedUser[0] = inv.getArgument(0);
            capturedUser[0].setId(UUID.randomUUID());
            return capturedUser[0];
        });

        service.register(req);
        assertThat(capturedUser[0].getRole()).isEqualTo(UserRole.OWNER);
    }

    @Test
    @DisplayName("register: rabbit failure does not abort user creation")
    void register_rabbitFailure_userStillSaved() {
        var req = registerReq("rabbit@test.com", "9900112255");
        when(userRepo.existsByEmail(anyString())).thenReturn(false);
        when(encoder.encode(anyString())).thenReturn("$hashed$");
        var saved = activeUser("rabbit@test.com", "9900112255");
        when(userRepo.save(any())).thenReturn(saved);
        when(jwtService.generateAccessToken(any())).thenReturn("tok");
        when(jwtService.generateRefreshToken(any())).thenReturn("ref");
        when(refreshRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        doThrow(new RuntimeException("AMQP down")).when(rabbit)
                .convertAndSend(anyString(), anyString(), any(Object.class));

        assertThatCode(() -> service.register(req)).doesNotThrowAnyException();
    }

    // ── login() ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("login: correct credentials return access and refresh tokens")
    void login_validCredentials_returnsTokens() {
        var user = activeUser("sujeet@test.com", "9845012345");
        when(userRepo.findByEmail("sujeet@test.com")).thenReturn(Optional.of(user));
        when(encoder.matches("Axis321#", "$hashed$")).thenReturn(true);
        when(jwtService.generateAccessToken(user)).thenReturn("access-ok");
        when(jwtService.generateRefreshToken(user.getId())).thenReturn("ref-ok");
        when(userRepo.save(any())).thenReturn(user);
        when(refreshRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var resp = service.login(loginReq("sujeet@test.com", "Axis321#"));
        assertThat(resp.getAccessToken()).isEqualTo("access-ok");
        assertThat(resp.getRefreshToken()).isEqualTo("ref-ok");
    }

    @Test
    @DisplayName("login: wrong password throws RuntimeException with 'Invalid credentials'")
    void login_wrongPassword_throws() {
        var user = activeUser("a@b.com", null);
        when(userRepo.findByEmail("a@b.com")).thenReturn(Optional.of(user));
        when(encoder.matches("wrong", "$hashed$")).thenReturn(false);

        assertThatThrownBy(() -> service.login(loginReq("a@b.com", "wrong")))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Invalid credentials");
    }

    @Test
    @DisplayName("login: unknown email throws RuntimeException with 'Invalid credentials'")
    void login_unknownEmail_throws() {
        when(userRepo.findByEmail("nobody@test.com")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.login(loginReq("nobody@test.com", "any")))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Invalid credentials");
    }

    @Test
    @DisplayName("login: suspended account throws RuntimeException with 'suspended'")
    void login_suspendedUser_throws() {
        var user = User.builder().id(UUID.randomUUID()).name("Sus").email("sus@test.com")
                .passwordHash("$hashed$").role(UserRole.OWNER).status(UserStatus.SUSPENDED).build();
        when(userRepo.findByEmail("sus@test.com")).thenReturn(Optional.of(user));
        when(encoder.matches("pw", "$hashed$")).thenReturn(true);

        assertThatThrownBy(() -> service.login(loginReq("sus@test.com", "pw")))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("suspended");
    }

    @Test
    @DisplayName("login: lastLoginAt is updated on successful login")
    void login_success_updatesLastLoginAt() {
        var user = activeUser("ts@test.com", null);
        when(userRepo.findByEmail("ts@test.com")).thenReturn(Optional.of(user));
        when(encoder.matches("pw", "$hashed$")).thenReturn(true);
        when(userRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.generateAccessToken(any())).thenReturn("tok");
        when(jwtService.generateRefreshToken(any())).thenReturn("ref");
        when(refreshRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.login(loginReq("ts@test.com", "pw"));
        assertThat(user.getLastLoginAt()).isNotNull();
    }

    // ── getProfile() ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("getProfile: known user returns UserDto with correct email")
    void getProfile_knownUser_returnsDto() {
        var user = activeUser("prof@test.com", null);
        when(userRepo.findById(user.getId())).thenReturn(Optional.of(user));

        var dto = service.getProfile(user.getId());
        assertThat(dto.getEmail()).isEqualTo("prof@test.com");
    }

    @Test
    @DisplayName("getProfile: unknown user throws RuntimeException")
    void getProfile_unknownUser_throws() {
        when(userRepo.findById(any())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getProfile(UUID.randomUUID()))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("User not found");
    }

    // ── changePassword() ──────────────────────────────────────────────────────

    @Test
    @DisplayName("changePassword: wrong current password throws RuntimeException")
    void changePassword_wrongCurrent_throws() {
        var user = activeUser("ch@test.com", null);
        when(userRepo.findById(user.getId())).thenReturn(Optional.of(user));
        when(encoder.matches("wrong", "$hashed$")).thenReturn(false);

        var req = new ChangePasswordRequest();
        req.setCurrentPassword("wrong");
        req.setNewPassword("NewPass@1");

        assertThatThrownBy(() -> service.changePassword(user.getId(), req))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Current password incorrect");
    }
}
