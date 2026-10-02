package in.aviqr.auth;

import in.aviqr.auth.entity.*;
import in.aviqr.auth.repository.*;
import in.aviqr.auth.service.*;
import in.aviqr.auth.dto.DeviceInfo;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import org.springframework.security.crypto.password.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import java.time.LocalDateTime;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

@DataJpaTest(properties={"spring.jpa.hibernate.ddl-auto=create-drop","spring.liquibase.enabled=false","spring.jpa.show-sql=false"})
@AutoConfigureTestDatabase(replace=AutoConfigureTestDatabase.Replace.NONE)
@Import({LoginSecurityService.class,OtpVerificationService.class,LoginSecurityPersistenceTest.EncoderConfig.class})
@Transactional(propagation=Propagation.NOT_SUPPORTED)
@EnabledIfSystemProperty(named="aviqr.security.test-db",matches=".+")
class LoginSecurityPersistenceTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url",()->System.getProperty("aviqr.security.test-db"));
        properties.add("spring.datasource.username",()->"security_test");
        properties.add("spring.datasource.password",()->"");
    }
    @TestConfiguration static class EncoderConfig {
        @Bean PasswordEncoder encoder() {return new BCryptPasswordEncoder(4);}
    }
    @Autowired OtpRepository otps;
    @Autowired LoginSecurityRepository records;
    @Autowired UserRepository users;
    @Autowired LoginSecurityService security;
    @Autowired OtpVerificationService verification;
    @Autowired PasswordEncoder encoder;
    @Autowired PlatformTransactionManager transactions;
    private User owner() {return users.save(User.builder().email(UUID.randomUUID()+"@example.com").name("Test")
        .role(UserRole.OWNER).status(UserStatus.ACTIVE).passwordHash("hash").build());}
    @Test void failedOtpCounterCommitsEvenWhenLoginTransactionRollsBack() {
        var email=UUID.randomUUID()+"@example.com";
        var record=otps.save(OtpRecord.builder().target(email).type(OtpType.EMAIL_LOGIN).otp(encoder.encode("123456"))
            .createdAt(LocalDateTime.now()).expiresAt(LocalDateTime.now().plusMinutes(10)).build());
        var transaction=new TransactionTemplate(transactions);
        assertThatThrownBy(()->transaction.execute(status->{
            assertThat(verification.verify(email,OtpType.EMAIL_LOGIN,"999999")).isFalse();
            throw new IllegalStateException("Login failed");
        })).hasMessageContaining("Login failed");
        assertThat(otps.findById(record.getId()).orElseThrow().getFailedAttempts()).isEqualTo(1);
        for(int attempt=1;attempt<5;attempt++) assertThat(verification.verify(email,OtpType.EMAIL_LOGIN,"999999")).isFalse();
        assertThat(verification.verify(email,OtpType.EMAIL_LOGIN,"123456")).isFalse();
        assertThat(otps.findById(record.getId()).orElseThrow().getUsed()).isTrue();
    }
    @Test void securityFailureEventSurvivesCallerRollback() {
        var email=UUID.randomUUID()+"@example.com";var transaction=new TransactionTemplate(transactions);
        assertThatThrownBy(()->transaction.execute(status->{
            security.event(email,"LOGIN_FAILURE","FAILED","Invalid credentials",DeviceInfo.builder().ipAddress("198.51.100.1").build(),null);
            throw new IllegalStateException("Rollback");
        })).hasMessageContaining("Rollback");
        assertThat(records.countByEmailAndKindAndCreatedAtAfter(email,"LOGIN_FAILURE",LocalDateTime.now().minusMinutes(1))).isEqualTo(1);
    }
    @Test void trustedCredentialIsHashedAndRevocationPreventsReuse() {
        var user=owner();var raw=security.trustDevice(user,DeviceInfo.builder().deviceId("test-device").build());
        var grant=records.findByUserIdAndKindAndStatus(user.getId(),"TRUSTED_DEVICE","ACTIVE").get(0);
        assertThat(grant.getTokenHash()).isNotEqualTo(raw).isEqualTo(LoginSecurityService.hash(raw));
        assertThat(security.exempt(user,DeviceInfo.builder().trustedDeviceToken(raw).build())).isTrue();
        security.revokeGrants(user.getId());
        assertThat(security.exempt(user,DeviceInfo.builder().trustedDeviceToken(raw).build())).isFalse();
    }
    @Test void passwordChallengeIsSingleUseAndBoundToAccount() {
        var user=owner();var raw=security.challenge(user,DeviceInfo.builder().build());
        assertThatThrownBy(()->security.consumeChallenge(raw,"other@example.com")).hasMessageContaining("Invalid");
        security.consumeChallenge(raw,user.getEmail());
        assertThatThrownBy(()->security.consumeChallenge(raw,user.getEmail())).hasMessageContaining("Invalid");
    }
    @Test void blockedAccountNeedsExpiryOrAuditedAdminUnblock() {
        var user=owner();var device=DeviceInfo.builder().ipAddress("198.51.100.2").build();
        for(int attempt=0;attempt<5;attempt++) security.event(user.getEmail(),"LOGIN_FAILURE","FAILED","Invalid credentials",device,null);
        assertThatThrownBy(()->security.checkBlocked(user.getEmail(),device)).hasMessageContaining("temporarily blocked");
        security.event(user.getEmail(),"LOGIN_UNBLOCK","COMPLETED","Verified identity",DeviceInfo.builder().build(),"admin");
        assertThatCode(()->security.checkBlocked(user.getEmail(),device)).doesNotThrowAnyException();
    }
}
