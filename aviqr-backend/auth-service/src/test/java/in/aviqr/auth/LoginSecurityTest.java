package in.aviqr.auth;
import in.aviqr.auth.dto.*;
import in.aviqr.auth.entity.*;
import in.aviqr.auth.repository.*;
import in.aviqr.auth.service.*;
import in.aviqr.auth.security.JwtService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.LocalDateTime;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

@ExtendWith(MockitoExtension.class)
class LoginSecurityTest {
    @Mock UserRepository users;
    @Mock OtpRepository otps;
    @Mock RefreshTokenRepository sessions;
    @Mock JwtService jwt;
    @Mock PasswordEncoder encoder;
    @Mock AuditLogService audit;
    @Mock RabbitTemplate rabbit;
    @Mock LoginSecurityService security;
    @Mock OtpVerificationService verification;
    @Mock ShopOwnershipService ownership;
    @InjectMocks AuthService auth;
    private User user(UserRole role,UserStatus status) {
        return User.builder().id(UUID.randomUUID()).name("Test").email("test@example.com")
            .role(role).status(status).passwordHash("hash").build();
    }
    @Test void publicSignupCannotCreateAnyPrivilegedOrStaffRole() {
        for (UserRole role : List.of(UserRole.ADMIN,UserRole.SUPPORT,UserRole.MANAGER,UserRole.CASHIER,UserRole.KITCHEN,UserRole.MENU_EDITOR,UserRole.ORDER_VIEWER)) {
            var req=new RegisterRequest();req.setRole(role);req.setEmail("test@example.com");req.setPassword("SecurePassword123");
            assertThatThrownBy(()->auth.register(req)).hasMessageContaining("administrator provisioning");
        }
        verifyNoInteractions(users,sessions);
    }
    @Test void privilegedPasswordLoginOnlyReturnsChallenge() {
        var user=user(UserRole.ADMIN,UserStatus.ACTIVE);
        when(users.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(encoder.matches("password",user.getPasswordHash())).thenReturn(true);
        when(security.challenge(eq(user),any())).thenReturn("challenge");
        var req=new LoginRequest();req.setEmail(user.getEmail());req.setPassword("password");
        var result=auth.login(req);
        assertThat(result.isRequiresOtp()).isTrue(); assertThat(result.getChallengeId()).isEqualTo("challenge");
        assertThat(result.getAccessToken()).isNull(); verifyNoInteractions(jwt,sessions);
    }
    @Test void privilegedOtpCannotBypassPasswordChallenge() {
        var user=user(UserRole.SUPPORT,UserStatus.ACTIVE);
        when(users.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        var req=new OtpLoginRequest();req.setEmail(user.getEmail());req.setOtp("123456");
        assertThatThrownBy(()->auth.loginWithOtp(req)).hasMessageContaining("password and OTP");
        verifyNoInteractions(verification,jwt,sessions);
    }
    @Test void inactiveOtpLoginsCannotIssueTokens() {
        for (UserStatus status : List.of(UserStatus.SUSPENDED,UserStatus.INACTIVE,UserStatus.PENDING,UserStatus.TERMINATED)) {
            var user=user(UserRole.SUPPORT,status);
            when(users.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
            var req=new OtpLoginRequest();req.setEmail(user.getEmail());req.setOtp("123456");req.setChallengeId("challenge");
            assertThatThrownBy(()->auth.loginWithOtp(req)).hasMessageContaining("not active");
        }
        verifyNoInteractions(verification,jwt,sessions);
    }
    @Test void inactiveAccountCannotRefresh() {
        var user=user(UserRole.SUPPORT,UserStatus.TERMINATED);
        var stored=RefreshToken.builder().id(UUID.randomUUID()).userId(user.getId()).token(LoginSecurityService.hash("raw"))
            .expiresAt(LocalDateTime.now().plusDays(1)).build();
        when(sessions.findByTokenAndRevokedFalse(LoginSecurityService.hash("raw"))).thenReturn(Optional.of(stored));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        var req=new RefreshTokenRequest();req.setRefreshToken("raw");
        assertThatThrownBy(()->auth.refreshToken(req)).hasMessageContaining("not active"); verifyNoInteractions(jwt);
    }
    @Test void unownedShopCannotBeLinked() {
        var user=user(UserRole.OWNER,UserStatus.ACTIVE);String shop=UUID.randomUUID().toString();
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        doThrow(new RuntimeException("Not owner")).when(ownership).requireOwner(user.getId(),shop);
        assertThatThrownBy(()->auth.linkShop(user.getId(),shop)).hasMessageContaining("Not owner");
        assertThat(user.getShopId()).isNull();verify(users,never()).save(any());verifyNoInteractions(jwt,sessions);
    }
    @Test void refreshRotatesHashedCredentialAndKeepsRevocableSessionId() {
        var user=user(UserRole.OWNER,UserStatus.ACTIVE);
        var id=UUID.randomUUID();
        var stored=RefreshToken.builder().id(id).userId(user.getId()).token(LoginSecurityService.hash("old"))
            .expiresAt(LocalDateTime.now().plusDays(1)).build();
        when(sessions.findByTokenAndRevokedFalse(LoginSecurityService.hash("old"))).thenReturn(Optional.of(stored));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(jwt.generateRefreshToken(user.getId())).thenReturn("new");
        when(jwt.generateAccessToken(eq(user),anyMap(),anyLong())).thenReturn("access");
        var req=new RefreshTokenRequest();req.setRefreshToken("old");var response=auth.refreshToken(req);
        assertThat(response.getRefreshToken()).isEqualTo("new");assertThat(stored.getToken()).isEqualTo(LoginSecurityService.hash("new"));
        assertThat(response.getSessionId()).isEqualTo(id);assertThat(stored.getRevoked()).isFalse();
        verify(jwt).generateAccessToken(eq(user),argThat(claims->id.toString().equals(claims.get("sid")) && "access".equals(claims.get("tokenType"))),anyLong());
    }
    @Test void privilegedAccountsCannotSkipOtpUsingExemptions() {
        var repository=mock(LoginSecurityRepository.class);
        var service=new LoginSecurityService(repository,otps,users);
        assertThat(service.exempt(user(UserRole.ADMIN,UserStatus.ACTIVE),DeviceInfo.builder().trustedDeviceToken("forged").build())).isFalse();
        assertThatThrownBy(()->service.trustDevice(user(UserRole.SUPPORT,UserStatus.ACTIVE),DeviceInfo.builder().build())).hasMessageContaining("always require OTP");
        verifyNoInteractions(repository);
    }
    @Test void deviceIdAloneNeverEstablishesTrust() {
        var repository=mock(LoginSecurityRepository.class);
        var service=new LoginSecurityService(repository,otps,users);
        assertThat(service.exempt(user(UserRole.OWNER,UserStatus.ACTIVE),DeviceInfo.builder().deviceId("spoofed-id").build())).isFalse();
        verify(repository,never()).findByTokenHashAndKindAndStatusAndExpiresAtAfter(any(),any(),any(),any());
    }
    @Test void passwordsCannotBeSilentlyTruncatedByBcrypt() {
        assertThatThrownBy(()->LoginSecurityService.validatePassword("short")).hasMessageContaining("12");
        assertThatThrownBy(()->LoginSecurityService.validatePassword("€".repeat(25))).hasMessageContaining("72");
        assertThatCode(()->LoginSecurityService.validatePassword("A secure long password")).doesNotThrowAnyException();
    }
}
