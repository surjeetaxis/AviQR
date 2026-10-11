package in.aviqr.auth.controller;
import in.aviqr.auth.dto.*;
import in.aviqr.auth.service.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/v1/auth/security") @RequiredArgsConstructor
public class AccountSecurityController {
    private final StepUpService stepUp;
    private final AuthService auth;
    private final LoginSecurityService security;
    public static DeviceInfo device(HttpServletRequest req) {
        return DeviceInfo.builder().ipAddress(req.getHeader("X-Forwarded-For")!=null?req.getHeader("X-Forwarded-For"):req.getRemoteAddr())
            .userAgent(req.getHeader("User-Agent")).deviceId(req.getHeader("X-Device-Id")).build();
    }
    public record Start(@NotBlank @Size(max=128) String password,@NotBlank String method,@NotBlank @Size(max=450) String target) {}
    public record Finish(@NotBlank @Size(max=100) String challengeId,@Pattern(regexp="[0-9]{6}") @NotNull String otp) {}
    @PostMapping("/step-up/start")
    public ApiResponse<Map<String,String>> start(@RequestHeader("X-User-Id") UUID uid,@RequestHeader("X-Session-Id") UUID sid,
        @Valid @RequestBody Start body,HttpServletRequest req) {
        return ApiResponse.ok(Map.of("challengeId",stepUp.start(uid,sid,body.password(),body.method(),body.target(),device(req))));
    }
    @PostMapping("/step-up/finish")
    public ApiResponse<Map<String,String>> finish(@RequestHeader("X-User-Id") UUID uid,@RequestHeader("X-Session-Id") UUID sid,
        @Valid @RequestBody Finish body,HttpServletRequest req) {
        return ApiResponse.ok(Map.of("token",stepUp.finish(uid,sid,body.challengeId(),body.otp(),device(req))));
    }
    @GetMapping("/sessions")
    public ApiResponse<org.springframework.data.domain.Page<SessionDto>> sessions(@RequestHeader("X-User-Id") UUID uid,@RequestHeader("X-Session-Id") UUID sid) {
        stepUp.current(uid,sid);return ApiResponse.ok(auth.listSessions(uid,org.springframework.data.domain.PageRequest.of(0,100)));
    }
    @PostMapping("/sessions/{id}/revoke")
    public ApiResponse<Void> revoke(@RequestHeader("X-User-Id") UUID uid,@RequestHeader("X-Session-Id") UUID sid,@PathVariable UUID id,HttpServletRequest req) {
        var user=stepUp.current(uid,sid);auth.revokeSession(uid,id,uid.toString());
        security.event(user.getEmail(),"SESSION_REVOKED","COMPLETED","User revoked session "+id,device(req),uid.toString());
        return ApiResponse.ok("Session revoked",null);
    }
}
