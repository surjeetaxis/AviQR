package in.aviqr.auth;
import in.aviqr.auth.controller.AdminSecurityController;
import in.aviqr.auth.entity.*;
import in.aviqr.auth.repository.*;
import in.aviqr.auth.service.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
@ExtendWith(MockitoExtension.class)
class AdminSecurityTest {
    @Mock LoginSecurityRepository records;
    @Mock UserRepository users;
    @Mock RefreshTokenRepository sessions;
    @Mock LoginSecurityService security;
    @Mock AuthService auth;
    @Mock PasswordEncoder encoder;
    @Mock AuditLogService audit;
    @InjectMocks AdminSecurityController controller;
    private final String actor=UUID.randomUUID().toString();
    private User support(UserStatus status) {return User.builder().id(UUID.randomUUID()).name("Agent").email("agent@example.com").role(UserRole.SUPPORT).status(status).build();}
    @Test void supportCannotRegisterApproveTerminateOrManageSecurity() {
        var req=new AdminSecurityController.SupportRequest("Agent","agent@example.com");
        var action=new AdminSecurityController.ActionRequest("Reason");var id=UUID.randomUUID();
        assertThatThrownBy(()->controller.createSupport(req,"SUPPORT",actor)).hasMessageContaining("Administrator");
        assertThatThrownBy(()->controller.approve(id,action,"SUPPORT",actor)).hasMessageContaining("Administrator");
        assertThatThrownBy(()->controller.terminate(id,action,"SUPPORT",actor)).hasMessageContaining("Administrator");
        assertThatThrownBy(()->controller.exemption(new AdminSecurityController.ExemptionRequest(id,"reason",7),"SUPPORT",actor)).hasMessageContaining("Administrator");
        assertThatThrownBy(()->controller.reset(new AdminSecurityController.EmailRequest("a@example.com","reason"),"SUPPORT",actor)).hasMessageContaining("Administrator");
        assertThatThrownBy(()->controller.records("LOGIN_SUCCESS",0,20,"SUPPORT")).hasMessageContaining("Administrator");
        verifyNoInteractions(records,users,sessions,auth,encoder);
    }
    @Test void newSupportAccountIsPendingAndHasNoIssuedCredentials() {
        when(encoder.encode(anyString())).thenReturn("hash");
        when(users.save(any())).thenAnswer(inv->{User user=inv.getArgument(0);user.setId(UUID.randomUUID());return user;});
        var response=controller.createSupport(new AdminSecurityController.SupportRequest("Agent","AGENT@example.com"),"ADMIN",actor);
        var captured=ArgumentCaptor.forClass(User.class);verify(users).save(captured.capture());
        assertThat(captured.getValue().getStatus()).isEqualTo(UserStatus.PENDING);
        assertThat(captured.getValue().getRole()).isEqualTo(UserRole.SUPPORT);
        assertThat(captured.getValue().getEmail()).isEqualTo("agent@example.com");verifyNoInteractions(sessions,auth);
    }
    @Test void approvalActivatesPendingAccountAndRequestsPasswordSetup() {
        var user=support(UserStatus.PENDING);when(users.findById(user.getId())).thenReturn(Optional.of(user));
        controller.approve(user.getId(),new AdminSecurityController.ActionRequest("Approved by manager"),"ADMIN",actor);
        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);verify(auth).forgotPassword(user.getEmail());
    }
    @Test void terminationCannotBeUndoneByApproval() {
        var user=support(UserStatus.TERMINATED);when(users.findById(user.getId())).thenReturn(Optional.of(user));
        assertThatThrownBy(()->controller.approve(user.getId(),new AdminSecurityController.ActionRequest("Approve"),"ADMIN",actor)).hasMessageContaining("pending");
        verifyNoInteractions(auth);
    }
    @Test void terminationRevokesSessionsAndSecurityGrants() {
        var user=support(UserStatus.ACTIVE);when(users.findById(user.getId())).thenReturn(Optional.of(user));
        controller.terminate(user.getId(),new AdminSecurityController.ActionRequest("Employment ended"),"ADMIN",actor);
        assertThat(user.getStatus()).isEqualTo(UserStatus.TERMINATED);
        verify(sessions).revokeAllByUserId(eq(user.getId()),eq(actor),any());verify(security).revokeGrants(user.getId());
    }
    @Test void privilegedExemptionsAreRejectedEvenForAdministrator() {
        var user=support(UserStatus.ACTIVE);when(users.findById(user.getId())).thenReturn(Optional.of(user));
        assertThatThrownBy(()->controller.exemption(new AdminSecurityController.ExemptionRequest(user.getId(),"Emergency",1),"ADMIN",actor)).hasMessageContaining("always require");
        verifyNoInteractions(records);
    }
    @Test void immutableLoginHistoryCannotBeRevoked() {
        var record=LoginSecurityRecord.builder().id(UUID.randomUUID()).kind("LOGIN_SUCCESS").build();
        when(records.findById(record.getId())).thenReturn(Optional.of(record));
        assertThatThrownBy(()->controller.revoke(record.getId(),new AdminSecurityController.ActionRequest("remove"),"ADMIN",actor)).hasMessageContaining("Only grants");
        verify(records,never()).save(any());
    }
    @Test void supportCanReviewOrdinaryAccountLocksButCannotUnlockPrivilegedAccounts() {
        when(records.findSupportRecords(eq("ACCOUNT_LOCK"),any(),any())).thenReturn(org.springframework.data.domain.Page.empty());
        controller.records("ACCOUNT_LOCK",0,20,"SUPPORT");
        verify(records).findSupportRecords(eq("ACCOUNT_LOCK"),eq(List.of(UserRole.ADMIN,UserRole.SUPPORT)),any());
        var target=support(UserStatus.ACTIVE);when(users.findByEmail(target.getEmail())).thenReturn(Optional.of(target));
        assertThatThrownBy(()->controller.unblock(new AdminSecurityController.EmailRequest(target.getEmail(),"Verified"),"SUPPORT",actor)).hasMessageContaining("privileged");
        verifyNoInteractions(security);
    }
    @Test void supportCannotRevokeTrustedDevices() {
        assertThatThrownBy(()->controller.revoke(UUID.randomUUID(),new AdminSecurityController.ActionRequest("reason"),"SUPPORT",actor)).hasMessageContaining("Administrator");
        verifyNoInteractions(records,sessions);
    }
}
