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
@Import({LoginSecurityService.class,OtpVerificationService.class,StepUpService.class,PasskeyService.class,LoginSecurityPersistenceTest.EncoderConfig.class})
@Transactional(propagation=Propagation.NOT_SUPPORTED)
@EnabledIfSystemProperty(named="aviqr.security.test-db",matches=".+")
class LoginSecurityPersistenceTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url",()->System.getProperty("aviqr.security.test-db"));
        properties.add("spring.datasource.username",()->"security_test");
        properties.add("spring.datasource.password",()->"");
    }
    @TestConfiguration static class EncoderConfig {
        @Bean com.fasterxml.jackson.databind.ObjectMapper json(){return new com.fasterxml.jackson.databind.ObjectMapper();}
        @Bean PasswordEncoder encoder() {return new BCryptPasswordEncoder(4);}
    }
    @org.springframework.boot.test.mock.mockito.MockBean org.springframework.amqp.rabbit.core.RabbitTemplate rabbit;
    @Autowired StepUpService stepUp;
    @Autowired PasskeyService passkeys;
    @Autowired RefreshTokenRepository sessions;
    @Autowired SecurityNoticeRepository notices;
    @Autowired PasskeyCeremonyRepository ceremonies;
    @Autowired PasskeyRepository keys;
    @Autowired com.fasterxml.jackson.databind.ObjectMapper json;
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
        assertThat(grant.getExpiresAt()).isBetween(LocalDateTime.now().plusDays(15).minusMinutes(1),LocalDateTime.now().plusDays(15).plusMinutes(1));
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
    @Test void fifthFailureCreatesFixedOneHourLockAndExpiryRestartsCounter() {
        var user=owner();var device=DeviceInfo.builder().ipAddress("198.51.100.10").build();
        for(int i=0;i<4;i++)security.event(user.getEmail(),"LOGIN_FAILURE","FAILED","wrong password",device,null);
        assertThatCode(()->security.checkBlocked(user.getEmail(),device)).doesNotThrowAnyException();
        security.event(user.getEmail(),"LOGIN_FAILURE","FAILED","wrong OTP",device,null);
        var lock=security.activeLock(user.getEmail()).orElseThrow();
        assertThat(lock.getExpiresAt()).isBetween(lock.getCreatedAt().plusHours(1).minusSeconds(1),lock.getCreatedAt().plusHours(1).plusSeconds(1));
        assertThatThrownBy(()->security.checkBlocked(user.getEmail(),device)).hasMessageContaining("one hour");
        assertThat(security.activeLock(user.getEmail()).orElseThrow().getExpiresAt()).isEqualTo(lock.getExpiresAt());
        lock.setCreatedAt(LocalDateTime.now().minusHours(2));
        lock.setExpiresAt(LocalDateTime.now().minusHours(1));records.save(lock);
        for(var failure:records.findAll()) if(user.getEmail().equals(failure.getEmail()) && "LOGIN_FAILURE".equals(failure.getKind())) {
            failure.setCreatedAt(LocalDateTime.now().minusHours(2).minusMinutes(1));records.save(failure);
        }
        security.event(user.getEmail(),"LOGIN_FAILURE","FAILED","new attempt",device,null);
        assertThat(security.activeLock(user.getEmail())).isEmpty();
    }
    @Test void otpSendingAllowsExactlyFivePerHourAndTracksActualIp() {
        var user=owner();var device=DeviceInfo.builder().ipAddress("198.51.100.11").build();
        for(int i=0;i<5;i++)security.reserveOtpSend(user.getEmail(),device,false);
        assertThatThrownBy(()->security.reserveOtpSend(user.getEmail(),device,false)).hasMessageContaining("five codes");
        assertThat(records.countByEmailAndKindAndCreatedAtAfter(user.getEmail(),"OTP_SEND",LocalDateTime.now().minusHours(1))).isEqualTo(5);
        assertThat(records.countByIpAddressAndKindAndCreatedAtAfter(device.getIpAddress(),"OTP_SEND",LocalDateTime.now().minusHours(1))).isEqualTo(5);
        // Recovery has a separate five-code quota so login-send exhaustion cannot prevent resetting.
        assertThatCode(()->security.reserveOtpSend(user.getEmail(),device,true)).doesNotThrowAnyException();
    }
    @Test void resetUnlockRollsBackWithFailedPasswordChange() {
        var user=owner();var device=DeviceInfo.builder().build();
        for(int i=0;i<5;i++)security.event(user.getEmail(),"LOGIN_FAILURE","FAILED","wrong",device,null);
        var transaction=new TransactionTemplate(transactions);
        assertThatThrownBy(()->transaction.execute(status->{security.unlockAfterReset(user.getEmail(),device);throw new IllegalStateException("Reset failed");})).hasMessageContaining("Reset failed");
        assertThat(security.activeLock(user.getEmail())).isPresent();
        security.unlockAfterReset(user.getEmail(),device);
        assertThat(security.activeLock(user.getEmail())).isEmpty();
    }
    @Test void simultaneousOtpRequestsCannotExceedQuota() throws Exception {
        var user=owner();var device=DeviceInfo.builder().ipAddress("198.51.100.20").build();
        var executor=java.util.concurrent.Executors.newFixedThreadPool(8);
        try {
            var jobs=new ArrayList<java.util.concurrent.Callable<Boolean>>();
            for(int i=0;i<8;i++) jobs.add(()->{try{security.reserveOtpSend(user.getEmail(),device,false);return true;}
                catch(org.springframework.web.server.ResponseStatusException e){assertThat(e.getStatusCode().value()).isEqualTo(429);return false;}});
            int sent=0;for(var result:executor.invokeAll(jobs))if(result.get())sent++;
            assertThat(sent).isEqualTo(5);
        } finally {executor.shutdownNow();}
    }
    @Test void supportRecordsExcludeAdminAndSupportAccounts() {
        var ordinary=owner();var privileged=owner();privileged.setRole(UserRole.ADMIN);users.save(privileged);
        for(var user:List.of(ordinary,privileged))security.event(user.getEmail(),"BLOCKED_LOGIN","BLOCKED","wrong",DeviceInfo.builder().build(),null);
        var page=records.findSupportRecords("BLOCKED_LOGIN",List.of(UserRole.ADMIN,UserRole.SUPPORT),org.springframework.data.domain.PageRequest.of(0,100));
        assertThat(page.getContent()).extracting(LoginSecurityRecord::getEmail).contains(ordinary.getEmail()).doesNotContain(privileged.getEmail());
    }

    private RefreshToken session(User user){return sessions.save(RefreshToken.builder().userId(user.getId()).token(LoginSecurityService.hash(UUID.randomUUID().toString())).expiresAt(LocalDateTime.now().plusDays(1)).createdAt(LocalDateTime.now()).build());}
    @Test void freshGrantIsBoundToUserSessionActionAndActualIpAndCannotReplay() {
        var user=owner();var session=session(user);var second=session(user);var ip=DeviceInfo.builder().ipAddress("198.51.100.100").build();
        var raw=stepUp.grant(user,session.getId(),"POST /api/v1/payments/pay-test/refund",ip,"PASSWORD_OTP");
        assertThat(stepUp.consume(user.getId(),second.getId(),raw,"POST","/api/v1/payments/pay-test/refund",ip)).isFalse();
        assertThat(stepUp.consume(user.getId(),session.getId(),raw,"POST","/api/v1/payments/pay-other/refund",ip)).isFalse();
        assertThat(stepUp.consume(user.getId(),session.getId(),raw,"POST","/api/v1/payments/pay-test/refund",DeviceInfo.builder().ipAddress("198.51.100.101").build())).isFalse();
        assertThat(stepUp.consume(user.getId(),session.getId(),raw,"POST","/api/v1/payments/pay-test/refund",ip)).isTrue();
        assertThat(stepUp.consume(user.getId(),session.getId(),raw,"POST","/api/v1/payments/pay-test/refund",ip)).isFalse();
    }
    @Test void simultaneousConsumptionAuthorizesOnlyOneAction() throws Exception {
        var user=owner();var session=session(user);var ip=DeviceInfo.builder().ipAddress("198.51.100.102").build();
        var raw=stepUp.grant(user,session.getId(),"DELETE /api/v1/auth/passkeys/test",ip,"PASSKEY");var executor=java.util.concurrent.Executors.newFixedThreadPool(4);
        try{var jobs=new ArrayList<java.util.concurrent.Callable<Boolean>>();for(int i=0;i<4;i++)jobs.add(()->stepUp.consume(user.getId(),session.getId(),raw,"DELETE","/api/v1/auth/passkeys/test",ip));int accepted=0;for(var job:executor.invokeAll(jobs))if(job.get())accepted++;assertThat(accepted).isEqualTo(1);}finally{executor.shutdownNow();}
    }
    @Test void passwordAndOtpMustBothVerifyBeforeFreshGrant() {
        var user=owner();user.setPasswordHash(encoder.encode("Correct-password-123"));users.save(user);var session=session(user);var ip=DeviceInfo.builder().ipAddress("198.51.100.103").build();
        var challenge=stepUp.start(user.getId(),session.getId(),"Correct-password-123","POST","/api/v1/auth/admin/security/unblock",ip);
        var message=org.mockito.ArgumentCaptor.forClass(Map.class);org.mockito.Mockito.verify(rabbit).convertAndSend(org.mockito.ArgumentMatchers.eq("aviqr.users"),org.mockito.ArgumentMatchers.eq("otp.requested"),message.capture());
        var otp=String.valueOf(message.getValue().get("otp"));
        assertThatThrownBy(()->stepUp.finish(user.getId(),session.getId(),challenge,"999999".equals(otp)?"999998":"999999",ip)).hasMessageContaining("Invalid verification");
        var grant=stepUp.finish(user.getId(),session.getId(),challenge,otp,ip);
        assertThat(stepUp.consume(user.getId(),session.getId(),grant,"POST","/api/v1/auth/admin/security/unblock",ip)).isTrue();
        assertThatThrownBy(()->stepUp.finish(user.getId(),session.getId(),challenge,otp,ip)).hasMessageContaining("expired");
    }
    @Test void notificationsAreDurableAndNewIpEventsAreDeduplicated() {
        var user=owner();var device=DeviceInfo.builder().ipAddress("198.51.100.104").build();
        security.event(user.getEmail(),"LOGIN_SUCCESS","SUCCESS","Password login",device,null);
        security.event(user.getEmail(),"LOGIN_SUCCESS","SUCCESS","Password login",device,null);
        assertThat(notices.findAll().stream().filter(n->user.getId().equals(n.getUserId()))).hasSize(1);
        security.event(user.getEmail(),"LOGIN_SUCCESS","SUCCESS","Password login",DeviceInfo.builder().ipAddress("198.51.100.105").build(),null);
        assertThat(notices.findAll().stream().filter(n->user.getId().equals(n.getUserId()))).hasSize(2);
    }
    private String b64(byte[] bytes){return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);}
    private byte[] hashBytes(byte[] bytes)throws Exception{return java.security.MessageDigest.getInstance("SHA-256").digest(bytes);}
    private byte[] join(byte[]... parts){var out=new java.io.ByteArrayOutputStream();for(var bytes:parts)out.writeBytes(bytes);return out.toByteArray();}
    private byte[] coordinate(java.math.BigInteger n){byte[] raw=n.toByteArray();return Arrays.copyOfRange(join(new byte[32],raw),raw.length,raw.length+32);}
    private String clientData(Map<String,Object> options,String type,String origin)throws Exception{
        var node=(com.fasterxml.jackson.databind.JsonNode)options.get("options");return json.writeValueAsString(Map.of("type",type,"origin",origin,"challenge",node.path("publicKey").path("challenge").asText(),"crossOrigin",false));
    }
    private byte[] authenticatorData(byte flags,int counter){return join(uncheckedHash("localhost".getBytes(java.nio.charset.StandardCharsets.UTF_8)),new byte[]{flags},java.nio.ByteBuffer.allocate(4).putInt(counter).array());}
    private byte[] uncheckedHash(byte[] bytes){try{return hashBytes(bytes);}catch(Exception e){throw new IllegalStateException(e);}}
    private String registration(Map<String,Object> options,java.security.KeyPair key,byte[] id,String origin)throws Exception{
        var publicKey=(java.security.interfaces.ECPublicKey)key.getPublic();var cose=com.upokecenter.cbor.CBORObject.NewMap().Add(1,2).Add(3,-7).Add(-1,1).Add(-2,coordinate(publicKey.getW().getAffineX())).Add(-3,coordinate(publicKey.getW().getAffineY())).EncodeToBytes();
        byte[] data=join(authenticatorData((byte)0x45,0),new byte[16],new byte[]{0,(byte)id.length},id,cose);
        byte[] attestation=com.upokecenter.cbor.CBORObject.NewMap().Add("fmt","none").Add("attStmt",com.upokecenter.cbor.CBORObject.NewMap()).Add("authData",data).EncodeToBytes();
        return json.writeValueAsString(Map.of("id",b64(id),"rawId",b64(id),"type","public-key","clientExtensionResults",Map.of(),"response",Map.of("clientDataJSON",b64(clientData(options,"webauthn.create",origin).getBytes(java.nio.charset.StandardCharsets.UTF_8)),"attestationObject",b64(attestation),"transports",List.of("internal"))));
    }
    private String assertion(Map<String,Object> options,java.security.KeyPair key,byte[] id,User user,String origin,boolean uv)throws Exception{
        byte[] client=clientData(options,"webauthn.get",origin).getBytes(java.nio.charset.StandardCharsets.UTF_8),data=authenticatorData(uv?(byte)0x05:(byte)0x01,1);
        var signature=java.security.Signature.getInstance("SHA256withECDSA");signature.initSign(key.getPrivate());signature.update(join(data,hashBytes(client)));
        return json.writeValueAsString(Map.of("id",b64(id),"rawId",b64(id),"type","public-key","clientExtensionResults",Map.of(),"response",Map.of("clientDataJSON",b64(client),"authenticatorData",b64(data),"signature",b64(signature.sign()),"userHandle",b64(user.getId().toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)))));
    }
    @Test void passkeyRegistrationAndVerifiedAssertionIssueSingleUseActionGrant()throws Exception{
        var user=owner();user.setRole(UserRole.ADMIN);users.save(user);var session=session(user);var device=DeviceInfo.builder().ipAddress("198.51.100.106").build();
        var generator=java.security.KeyPairGenerator.getInstance("EC");generator.initialize(new java.security.spec.ECGenParameterSpec("secp256r1"));var key=generator.generateKeyPair();byte[] id=new byte[32];new java.security.SecureRandom().nextBytes(id);
        var registration=passkeys.registrationOptions(user.getId(),session.getId());var registrationId=(UUID)registration.get("ceremonyId");
        passkeys.register(user.getId(),session.getId(),registrationId,registration(registration,key,id,"http://localhost:5173"),"Test authenticator",device);
        assertThat(passkeys.list(user.getId(),session.getId())).hasSize(1);
        var options=passkeys.assertionOptions(user.getId(),session.getId(),"POST","/api/v1/auth/admin/security/unblock");var ceremonyId=(UUID)options.get("ceremonyId");
        assertThatThrownBy(()->passkeys.assertCredential(user.getId(),session.getId(),ceremonyId,assertion(options,key,id,user,"https://evil.example",true),device)).hasMessageContaining("could not be verified");
        assertThatThrownBy(()->passkeys.assertCredential(user.getId(),session.getId(),ceremonyId,assertion(options,key,id,user,"http://localhost:5173",false),device)).hasMessageContaining("could not be verified");
        var proof=passkeys.assertCredential(user.getId(),session.getId(),ceremonyId,assertion(options,key,id,user,"http://localhost:5173",true),device);
        assertThat(stepUp.consume(user.getId(),session.getId(),proof,"POST","/api/v1/auth/admin/security/unblock",device)).isTrue();
        assertThatThrownBy(()->passkeys.assertCredential(user.getId(),session.getId(),ceremonyId,assertion(options,key,id,user,"http://localhost:5173",true),device)).hasMessageContaining("already used");
        var stored=keys.findByUserIdAndActiveTrue(user.getId()).get(0);passkeys.revoke(user.getId(),session.getId(),stored.getId(),device);assertThat(keys.findByUserIdAndActiveTrue(user.getId())).isEmpty();
    }
    @Test void ordinaryAccountsCannotEnrollPrivilegedPasskeys(){var user=owner();var session=session(user);assertThatThrownBy(()->passkeys.registrationOptions(user.getId(),session.getId())).hasMessageContaining("admin and support");}
}
