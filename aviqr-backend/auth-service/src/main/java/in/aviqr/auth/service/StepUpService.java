package in.aviqr.auth.service;
import in.aviqr.auth.dto.DeviceInfo;
import in.aviqr.auth.entity.*;
import in.aviqr.auth.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.security.SecureRandom;
import java.util.*;

@Service @RequiredArgsConstructor
public class StepUpService {
    private final UserRepository users;
    private final RefreshTokenRepository sessions;
    private final LoginSecurityRepository records;
    private final LoginSecurityService security;
    private final OtpRepository otps;
    private final OtpVerificationService verification;
    private final PasswordEncoder passwords;
    private final RabbitTemplate rabbit;
    public User current(UUID userId, UUID sessionId) {
        var user=users.findById(userId).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Account required"));
        LoginSecurityService.requireActive(user);
        if(sessions.findByIdAndUserId(sessionId,userId).filter(s->!Boolean.TRUE.equals(s.getRevoked()) && s.getExpiresAt().isAfter(LocalDateTime.now())).isEmpty())
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Active session required");
        return user;
    }
    public String action(String method,String target) {
        if(!Set.of("POST","PUT","PATCH","DELETE").contains(method) || target==null || !target.startsWith("/api/v1/") || target.length()>450 || target.contains("\n") || target.contains("\r") || target.contains("#"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid verification target");
        return method+" "+target;
    }
    @Transactional
    public String start(UUID uid,UUID sid,String password,String method,String target,DeviceInfo device) {
        var user=current(uid,sid);String action=action(method,target);security.checkBlocked(user.getEmail(),device);
        if(password==null || !passwords.matches(password,user.getPasswordHash())) {
            security.event(user.getEmail(),"LOGIN_FAILURE","FAILED","Fresh verification: invalid password",device,null);
            security.checkBlocked(user.getEmail(),device);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid password");
        }
        security.reserveOtpSend(user.getEmail(),device,false);
        String code=String.format("%06d",new SecureRandom().nextInt(1_000_000));
        otps.save(OtpRecord.builder().target(user.getEmail()).type(OtpType.STEP_UP).otp(passwords.encode(code))
            .createdAt(LocalDateTime.now()).expiresAt(LocalDateTime.now().plusMinutes(5)).used(false).build());
        String raw=LoginSecurityService.randomToken();
        records.save(LoginSecurityRecord.builder().userId(uid).email(user.getEmail()).kind("STEP_UP_CHALLENGE").status("ACTIVE")
            .tokenHash(LoginSecurityService.hash(raw)).deviceId(sid.toString()).reason(action).createdAt(LocalDateTime.now()).expiresAt(LocalDateTime.now().plusMinutes(5)).build());
        rabbit.convertAndSend("aviqr.users","otp.requested",Map.of("email",user.getEmail(),"otp",code,"name",user.getName()));
        return raw;
    }
    @Transactional
    public String finish(UUID uid,UUID sid,String challenge,String otp,DeviceInfo device) {
        var user=current(uid,sid);security.checkBlocked(user.getEmail(),device);
        var record=records.findByTokenHashAndKindAndStatusAndExpiresAtAfter(LoginSecurityService.hash(challenge),"STEP_UP_CHALLENGE","ACTIVE",LocalDateTime.now())
            .filter(c->uid.equals(c.getUserId()) && sid.toString().equals(c.getDeviceId()))
            .orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Verification expired"));
        if(!verification.verify(user.getEmail(),OtpType.STEP_UP,otp)) {
            security.event(user.getEmail(),"LOGIN_FAILURE","FAILED","Fresh verification: invalid OTP",device,null);
            security.checkBlocked(user.getEmail(),device);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid verification code");
        }
        record.setStatus("USED");records.save(record);
        return grant(user,sid,record.getReason(),device,"PASSWORD_OTP");
    }
    @Transactional
    public String grant(User user,UUID sid,String action,DeviceInfo device,String method) {
        String raw=LoginSecurityService.randomToken();
        records.save(LoginSecurityRecord.builder().userId(user.getId()).email(user.getEmail()).kind("STEP_UP_GRANT").status("ACTIVE")
            .tokenHash(LoginSecurityService.hash(raw)).deviceId(sid.toString()).reason(action).ipAddress(device.getIpAddress())
            .createdAt(LocalDateTime.now()).expiresAt(LocalDateTime.now().plusMinutes(2)).build());
        security.event(user.getEmail(),"STEP_UP_VERIFIED","SUCCESS",method,device,user.getId().toString());
        return raw;
    }
    @Transactional
    public boolean consume(UUID uid,UUID sid,String raw,String method,String target,DeviceInfo device) {
        if(raw==null || raw.isBlank())return false;
        var user=current(uid,sid);
        var record=records.findByTokenHashAndKindAndStatusAndExpiresAtAfter(LoginSecurityService.hash(raw),"STEP_UP_GRANT","ACTIVE",LocalDateTime.now())
            .filter(c->uid.equals(c.getUserId()) && sid.toString().equals(c.getDeviceId()) && action(method,target).equals(c.getReason())
                && Objects.equals(c.getIpAddress(),device.getIpAddress()));
        if(record.isEmpty())return false;
        record.get().setStatus("USED");records.save(record.get());
        security.event(user.getEmail(),"SENSITIVE_ACTION","AUTHORIZED",action(method,target),device,uid.toString());
        return true;
    }
}
